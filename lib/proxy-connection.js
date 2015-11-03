var Transactions = require('./transactions');
var PluginStreaming = require('./plugin/streaming');
var auth = require('./auth');
var logger = require('./logger');
var streams = require('./streams');
var cmApiClient = require('./cm-api-client');

/**
 * @param {BrowserConnection} browserConnection
 * @param {JanusConnection} janusConnection
 * @constructor
 */
function ProxyConnection(browserConnection, janusConnection) {
  this.plugins = {};
  this.transactions = new Transactions();
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
}

ProxyConnection.prototype.processMessage = function(message) {
  if (message.transaction) {
    var pendingTransaction = this.transactions.find(message.transaction);
    if (pendingTransaction) {
      pendingTransaction(message);
    }
  }

  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    return this.getPlugin(pluginId).processMessage(message);
  }

  if ('attach' === message.janus) {
    return this.onAttach(message);
  }

  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
ProxyConnection.prototype.onAttach = function(message) {
  var self = this;
  if (!this.isAllowedPlugin(message.plugin)) {
    return Promise.reject('Disallowed plugin ' + message.plugin);
  }

  this.transactions.add(message.transaction, function(response) {
    if (response.janus === 'ack') {

    }
    if (response.janus === 'success') {
      var pluginId = response.data.id;
      self.plugins[pluginId] = self.pluginFactory(message.plugin, pluginId);
      self.transactions.remove(message.transaction);
    }
  });
  return Promise.resolve(message);
};


ProxyConnection.prototype.destroy = function() {
  if (this.browserConnection.isOpened()) {
    this.browserConnection.removeAllListeners();
    this.browserConnection.close();
  }
  if (this.janusConnection.isOpened()) {
    this.janusConnection.removeAllListeners();
    this.janusConnection.close();
  }
  streams.findAllByConnection(this.browserConnection).forEach(function(stream) {
    streams.remove(stream);
    logger.info('removing stream', stream);
    cmApiClient.removeStream(stream.channelName, stream.id);
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
 * @returns {Plugin}
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
  'janus.plugin.streaming': PluginStreaming
};

module.exports = ProxyConnection;
