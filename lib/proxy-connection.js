var _ = require('underscore');
var Promise = require('bluebird');
var Transactions = require('./transactions');
var PluginVideo = require('./plugin/video');
var JanusError = require('./janus-error');

var serviceLocator = require('./service-locator');

/**
 * @param {BrowserConnection} browserConnection
 * @param {JanusConnection} janusConnection
 * @constructor
 */
function ProxyConnection(browserConnection, janusConnection) {
  this.sessionId = null;
  this.sessionData = null;
  this.plugins = {};
  this.transactions = new Transactions();
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
}

/**
 * @param {Object} message
 */
ProxyConnection.prototype.processMessage = function(message) {
  return this._processMessage(message).catch(function(error) {
    if (!error instanceof JanusError.Error) {
      serviceLocator.get('logger').error('Unexpected error', error);
      error = new JanusError.Unknown(message['transaction']);
    }
    this.browserConnection.send(error.response);
    throw error;
  }.bind(this));
};

ProxyConnection.prototype._processMessage = function(message) {
  if (message['transaction']) {
    if (this.transactions.find(message['transaction'])) {
      return this.transactions.execute(message['transaction'], message);
    }
  }

  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    return this.getPlugin(pluginId).processMessage(message);
  }
  var janusMessage = message['janus'];

  if ('create' === janusMessage) {
    return this.onCreate(message);
  }
  if ('attach' === janusMessage) {
    return this.onAttach(message);
  }
  if ('destroy' === janusMessage) {
    return this.onDestroy(message);
  }

  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
ProxyConnection.prototype.onCreate = function(message) {
  this.transactions.add(message['transaction'], function(response) {
    if ('success' == response['janus']) {
      this.sessionId = response['data']['id'];
      this.sessionData = message['token'];
      return Promise.resolve(response);
    }
    return Promise.reject(new Error('Unknown session create response'));
  }.bind(this));
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
ProxyConnection.prototype.onDestroy = function(message) {
  this.transactions.add(message['transaction'], function(response) {
    this.close();
    return Promise.resolve(response);
  }.bind(this));
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
ProxyConnection.prototype.onAttach = function(message) {
  var self = this;
  if (!this.isAllowedPlugin(message['plugin'])) {
    return Promise.reject(new JanusError.IllegalPlugin(message['transaction']));
  }

  this.transactions.add(message['transaction'], function(response) {
    if (response['janus'] === 'success') {
      var pluginId = response['data']['id'];
      self.plugins[pluginId] = self.pluginFactory(message['plugin'], pluginId);
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};


ProxyConnection.prototype.close = function() {
  if (this.browserConnection.isOpened()) {
    this.browserConnection.removeAllListeners('message');
    this.browserConnection.close();
  }
  if (this.janusConnection.isOpened()) {
    this.janusConnection.removeAllListeners('message');
    this.janusConnection.close();
  }
  var streams = serviceLocator.get('streams');
  streams.findAllByConnection(this).forEach(function(stream) {
    streams.remove(stream);
    serviceLocator.get('logger').info('removing stream', stream);
    serviceLocator.get('cm-api-client').removeStream(stream.channelName, stream.id);
  });
  this.sessionId = null;
};

/**
 * @param {String} streamId
 */
ProxyConnection.prototype.stopStream = function(streamId) {
  return new Promise(function(resolve) {
    var streams = serviceLocator.get('streams');
    streams.on('remove', function removeStream(removedStreamId) {
      if (streamId == removedStreamId) {
        streams.removeListener('remove', removeStream);
        resolve();
      }
    });

    this.janusConnection.send({
      janus: 'message',
      body: {request: 'stop'},
      transaction: ProxyConnection.generateTransactionId(),
      session_id: this.sessionId,
      handle_id: this._getPluginByStreamId(streamId).id
    });
  }.bind(this));
};

/**
 * @param {String} streamId
 * @returns
 */
ProxyConnection.prototype._getPluginByStreamId = function(streamId) {
  return _.find(this.plugins, function(plugin) {
    return plugin.stream && streamId == plugin.stream.id;
  });
};

/**
 * @param {String} type
 * @param {String} id
 * @returns {*}
 */
ProxyConnection.prototype.pluginFactory = function(type, id) {
  var pluginClass = ProxyConnection.pluginTypes[type];
  if (!pluginClass) {
    throw new Error('Invalid plugin');
  }
  return new pluginClass(id, type, this);
};

/**
 * @param {String} id
 * @returns {PluginAbstract}
 */
ProxyConnection.prototype.getPlugin = function(id) {
  return this.plugins[id];
};

/**
 * @param {String} id
 */
ProxyConnection.prototype.removePlugin = function(id) {
  delete this.plugins[id];
};

/**
 * @param {String} type
 * @returns {Boolean}
 */
ProxyConnection.prototype.isAllowedPlugin = function(type) {
  return !!ProxyConnection.pluginTypes[type];
};

ProxyConnection.pluginTypes = {
  'janus.plugin.streaming': PluginVideo
};

/**
 * @returns {String}
 */
ProxyConnection.generateTransactionId = function() {
  return Math.random().toString(36).substring(2, 12);
};

module.exports = ProxyConnection;
