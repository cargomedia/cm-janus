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

  /** @type {ProxyConnection} */
  this.connection = connection;

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.data = data;

  /** @type {ObjectCollection} */
  this.plugins = new ObjectCollection();

  /** @type {PluginRegistry} */
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

module.exports = Session;
