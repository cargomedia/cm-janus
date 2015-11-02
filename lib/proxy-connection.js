var transactions = require('./transactions');
var Transaction = require('./transaction');
var PluginStreaming = require('./plugin/streaming');
var auth = require('./auth');

/**
 * @param {BrowserConnection} browserConnection
 * @param {JanusConnection} janusConnection
 * @constructor
 */
function ProxyConnection(browserConnection, janusConnection) {
  this.plugins = {};
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
}

ProxyConnection.prototype.processMessage = function(message) {
  if (message.transaction) {
    var pendingTransaction = transactions.find(message.transaction);
    if (pendingTransaction) {
      pendingTransaction.onResponse(message);
    }
  }

  var pluginId = message['handle_id'] || message['sender'] || null;
  if (pluginId) {
    return this.getPlugin(pluginId).processMessage(message);
  }

  if ('attach' === message.janus) {
    return this.onAttach(message);
  }

  if ('detach' === message.janus) {
    return this.onDetach(message);
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

  var transaction = new Transaction(message.transaction, function(response) {
    if (response.janus === 'ack') {

    }
    if (response.janus === 'success') {
      var pluginId = response.data.id;
      self.plugins[pluginId] = self.pluginFactory(message.plugin, pluginId);
      transaction.remove();
    }
  });
  transactions.add(transaction);
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
ProxyConnection.prototype.onDetach = function(message) {
  var self = this;
  var transaction = new Transaction(message.transaction, function(response) {
    delete self.plugins[response.sender];
    transactions.remove(transaction);
  });
  transactions.add(transaction);
  return Promise.resolve(message);
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
  return new pluginClass(id, type, this.proxyConnection, this.janusConnection);
};

ProxyConnection.pluginTypes = {
  'janus.plugin.streaming': PluginStreaming
};

/**
 * @param {String} id
 * @returns {Plugin}
 */
ProxyConnection.prototype.getPlugin = function(id) {
  return this.plugins[id];
};

/**
 * @param {String} type
 * @returns {Boolean}
 */
ProxyConnection.prototype.isAllowedPlugin = function(type) {
  return !!this.types[type];
};

module.exports = ProxyConnection;
