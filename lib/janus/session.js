var _ = require('underscore');
var Promise = require('bluebird');
var PluginVideo = require('./plugin/video');
var PluginAudio = require('./plugin/audio');
var PluginRegistry = require('./plugin-registry');
var JanusError = require('./error');

var serviceLocator = require('../service-locator');

/**
 * @param {JanusConnection} connection
 * @param {Number} id
 * @param {String} data
 * @constructor
 */
function Session(connection, id, data) {
  this.connection = connection;
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
  var janusMessage = message['janus'];

  if ('attach' === janusMessage) {
    return this.onAttach(message);
  }
  if ('hangup' === janusMessage) {
    return this.onDetached(message);
  }
  if ('detached' === janusMessage) {
    return this.onDetached(message);
  }

  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    var plugin = this.plugins[pluginId];
    if (!plugin) {
      return Promise.reject(new Error('Invalid plugin id'));
    }
    return plugin.processMessage(message);
  }

  return Promise.resolve(message);
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
      var pluginId = response['data']['id'];
      var plugin = self.pluginRegistry.instantiatePlugin(pluginId, message['plugin'], self);
      self.plugins[pluginId] = plugin;
      serviceLocator.get('logger').info('Added ' + plugin + ' for ' + self);
      return Promise.resolve(response);
    }
    return Promise.reject(new Error('Unknown attach plugin response'));
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Session.prototype.onDetached = function(message) {
  var pluginId = message['sender'];
  this._removePlugin(pluginId);
  return Promise.resolve(message);
};

/**
 * @param {String} id
 */
Session.prototype._removePlugin = function(id) {
  this.plugins[id].onRemove();
  delete this.plugins[id];
};

Session.prototype.onRemove = function() {
  _.each(this.plugins, function(plugin, id) {
    this._removePlugin(id);
  }.bind(this));
  serviceLocator.get('logger').info('Removed ' + this);
};

Session.prototype.toString = function() {
  return 'Session' + JSON.stringify({id: this.id});
};

module.exports = Session;
