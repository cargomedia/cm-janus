var _ = require('underscore');
var Promise = require('bluebird');
var PluginVideo = require('./plugin/video');
var PluginAudio = require('./plugin/audio');
var PluginRegistry = require('./plugin/plugin-registry');
var JanusError = require('./janus-error');
var ObjectCollection = require('./object-collection');

var serviceLocator = require('./service-locator');

/**
 * @param {ProxyConnection} connection
 * @param {String} id
 * @param {String} data
 * @constructor
 */
function Session(connection, id, data) {
  this.connection = connection;
  this.id = id;
  this.data = data;
  this.plugins = new ObjectCollection();
  this.pluginRegistry = new PluginRegistry([PluginVideo, PluginAudio]);
}

Session.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];
  if ('attach' === janusMessage) {
    return this.onAttach(message);
  }
  if ('detach' === janusMessage) {
    return this.onDetach(message);
  }

  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    return this.plugins.getById(pluginId).processMessage(message);
  }
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Session.prototype.onAttach = function(message) {
  var self = this;
  if (!this.pluginRegistry.isAllowedPlugin(message['plugin'])) {
    return Promise.reject(new JanusError.IllegalPlugin(message['transaction']));
  }

  this.connection.transactions.add(message['transaction'], function(response) {
    if (response['janus'] === 'success') {
      var plugin = self.pluginRegistry.instantiatePlugin(response['data']['id'], message['plugin'], self);
      self.plugins.add(plugin);
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Session.prototype.onDetach = function(message) {
  this.plugins.removeById(message['sender']);
  return Promise.resolve(message);
};

/**
 * @param {String} streamId
 */
Session.prototype.stopStream = function(streamId) {
  return new Promise(function(resolve) {
    var streams = serviceLocator.get('streams');
    streams.on('remove', function removeStream(removedStreamId) {
      if (streamId == removedStreamId) {
        streams.removeListener('remove', removeStream);
        resolve();
      }
    });

    this.connection.janusConnection.send({
      janus: 'message',
      body: {request: 'stop'},
      transaction: Session.generateTransactionId(),
      session_id: this.id,
      handle_id: this._getPluginByStreamId(streamId).id
    });
  }.bind(this));
};

/**
 * @param {String} streamId
 * @returns
 */
Session.prototype._getPluginByStreamId = function(streamId) {
  return this.plugins.find(function(plugin) {
    return plugin.stream && streamId == plugin.stream.id;
  });
};

module.exports = Session;
