var _ = require('underscore');
var Promise = require('bluebird');
var PluginVideo = require('./plugin/video');
var PluginAudio = require('./plugin/audio');
var PluginRegistry = require('./plugin-registry');
var JanusError = require('./error');
var Context = require('../context');

var serviceLocator = require('../service-locator');

/**
 * @param {JanusConnection} connection
 * @param {Number} id
 * @param {String} data
 * @param {Context} [context]
 * @constructor
 */
function Session(connection, id, data, context) {

  /** @type {Connection} */
  this.connection = connection;

  /** @type {Number} */
  this.id = id;

  /** @type {String} */
  this.data = data;

  if (!context) {
    context = new Context();
  }
  /** @type {Context} */
  this.context = context.extend({session: this.id});

  /** @type {Object} */
  this.plugins = {};

  /** @type {PluginRegistry} */
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
  if ('detached' === janusMessage) {
    return this.onDetached(message);
  }

  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    var plugin = this.plugins[pluginId];
    if (plugin) {
      return plugin.processMessage(message);
    } else {
      return Promise.reject(new JanusError.InvalidPlugin(pluginId));
    }
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
    return Promise.reject(new JanusError.IllegalPlugin());
  }

  this.connection.transactions.add(message['transaction'], function(response) {
    if (response['janus'] === 'success') {
      var pluginId = response['data']['id'];
      var plugin = self.pluginRegistry.instantiatePlugin(pluginId, message['plugin'], self, self.context.clone());
      self.plugins[pluginId] = plugin;
      serviceLocator.get('logger').info('Added plugin', plugin.getContext());
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
  if (this.plugins[id]) {
    return this.plugins[id].onRemove().then(function() {
      delete this.plugins[id];
    }.bind(this));
  }
  return Promise.resolve();
};

Session.prototype.onRemove = function() {
  var self = this;
  return Promise.all(_.map(this.plugins, function(plugin, id) {
    return self._removePlugin(id).reflect();
  })).then(function() {
    serviceLocator.get('logger').info('Removed session', self.getContext());
  });
};

Session.prototype.toString = function() {
  return 'Session' + JSON.stringify({id: this.id});
};

/**
 * @returns {Object}
 */
Session.prototype.getContext = function() {
  return this.context.toHash();
};

module.exports = Session;
