var _ = require('underscore');
var Promise = require('bluebird');
var Transactions = require('./transactions');
var PluginVideo = require('./plugin/video');
var PluginAudio = require('./plugin/audio');
var PluginRegistry = require('./plugin/plugin-registry');
var JanusError = require('./janus-error');

var serviceLocator = require('./service-locator');

/**
 * @param {Connection} browserConnection
 * @param {Connection} janusConnection
 * @constructor
 */
function ProxyConnection(browserConnection, janusConnection) {
  this.sessionId = null;
  this.sessionData = null;
  this.plugins = {};
  this.transactions = new Transactions();
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
  this.pluginRegistry = new PluginRegistry([PluginVideo, PluginAudio]);
  this._installListeners();
}

ProxyConnection.prototype._installListeners = function() {
  var self = this;
  this.browserConnection.on('message', function(request) {
    self.processMessage(request).then(function() {
      self.janusConnection.send(request);
    })
  });

  this.janusConnection.on('message', function(request) {
    self.processMessage(request).then(function() {
      self.browserConnection.send(request);
    })
  });

  this.browserConnection.on('close', this.close.bind(this));
  this.browserConnection.on('error', this.closeOnError.bind(this));
  this.janusConnection.on('close', this.close.bind(this));
  this.janusConnection.on('error', this.closeOnError.bind(this));
};

/**
 * @param {Object} message
 */
ProxyConnection.prototype.processMessage = function(message) {
  return this._processMessage(message).catch(function(error) {
    throw this._processUnexpectedError(error);
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
  if (!this.pluginRegistry.isAllowedPlugin(message['plugin'])) {
    return Promise.reject(new JanusError.IllegalPlugin(message['transaction']));
  }

  this.transactions.add(message['transaction'], function(response) {
    if (response['janus'] === 'success') {
      var pluginId = response['data']['id'];
      self.plugins[pluginId] = self.pluginRegistry.instantiatePlugin(pluginId, message['plugin'], self);
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

ProxyConnection.prototype.closeOnError = function(error) {
  this._processUnexpectedError(error);
  this.close();
};

ProxyConnection.prototype.close = function() {
  this.browserConnection.removeAllListeners('message');
  if (this.browserConnection.isOpened()) {
    this.browserConnection.close();
  }
  this.janusConnection.removeAllListeners('message');
  if (this.janusConnection.isOpened()) {
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
 * @param {Error} error
 * @returns {JanusError.Error}
 */
ProxyConnection.prototype._processUnexpectedError = function(error) {
  if (!(error instanceof JanusError.Error)) {
    serviceLocator.get('logger').warn('"' + this.identifier + '" connection processMessage error' + error);
    error = new JanusError.Unknown(ProxyConnection.generateTransactionId());
  }
  this.browserConnection.send(error.response);
  return error;
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
 * @returns {String}
 */
ProxyConnection.generateTransactionId = function() {
  return Math.random().toString(36).substring(2, 12);
};

module.exports = ProxyConnection;
