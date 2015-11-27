var _ = require('underscore');
var Promise = require('bluebird');
var PluginVideo = require('./plugin/video');
var PluginAudio = require('./plugin/audio');
var PluginRegistry = require('./plugin/plugin-registry');
var JanusError = require('./error');
var ObjectCollection = require('./../object-collection');

var serviceLocator = require('./../service-locator');

/**
 * @param {JanusConnection} connection
 * @param {String} id
 * @param {String} data
 * @constructor
 */
function JanusSession(connection, id, data) {

  /** @type {JanusConnection} */
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

JanusSession.prototype.processRequest = function(message) {
  var janusMessage = message['janus'];
  if ('attach' === janusMessage) {
    return this.onAttach(message);
  }
  if ('detach' === janusMessage) {
    return this.onDetach(message);
  }
  if (message['handle_id']) {
    return this.plugins.getById(message['handle_id']).processRequest(message);
  }
  return Promise.resolve();
};

JanusSession.prototype.processIncoming = function(message) {
  if (message['sender']) {
    return this.plugins.getById(message['sender']).processIncoming(message);
  }
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusSession.prototype.onAttach = function(message) {
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
JanusSession.prototype.onDetach = function(message) {
  this.plugins.removeById(message['sender']);
  return Promise.resolve(message);
};

module.exports = JanusSession;
