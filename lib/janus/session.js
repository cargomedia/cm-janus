var _ = require('underscore');
var Promise = require('bluebird');
var PluginVideo = require('../plugin/video');
var PluginAudio = require('../plugin/audio');
var PluginRegistry = require('../plugin/plugin-registry');
var JanusError = require('../janus-error');

var serviceLocator = require('../service-locator');

/**
 * @param {ProxyConnection} proxyConnection
 * @param {Number} id
 * @param {String} data
 * @constructor
 */
function Session(proxyConnection, id, data) {
  this.proxyConnection = proxyConnection;
  this.id = id;
  this.data = data;
  this.plugins = {};
  this.pluginRegistry = new PluginRegistry([PluginVideo, PluginAudio]);
}

/**
 * @param {Object} message
 * @returns {Promise}
 */
Session.prototype.processMessage = function(message) {
  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    var plugin = this.getPlugin(pluginId);
    if (!plugin) {
      return Promise.reject(new Error('Invalid plugin id'));
    }
    return plugin.processMessage(message);
  }
  var janusMessage = message['janus'];

  if ('attach' === janusMessage) {
    return this.onAttach(message);
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

  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    if (response['janus'] === 'success') {
      var pluginId = response['data']['id'];
      self.plugins[pluginId] = self.pluginRegistry.instantiatePlugin(pluginId, message['plugin'], self.proxyConnection);
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {String} streamId
 * @returns
 */
Session.prototype._getPluginByStreamId = function(streamId) {
  return _.find(this.plugins, function(plugin) {
    return plugin.stream && streamId == plugin.stream.id;
  });
};

/**
 * @param {String} id
 * @returns {PluginAbstract}
 */
Session.prototype.getPlugin = function(id) {
  return this.plugins[id];
};

/**
 * @param {String} id
 */
Session.prototype.removePlugin = function(id) {
  delete this.plugins[id];
};

module.exports = Session;
