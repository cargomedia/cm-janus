var _ = require('underscore');
var logger = require('./logger');
var WebSocket = require('ws');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * @param {WebSocket} browserConnection
 * @param {JanusConnection} janusConnection
 * @param {Auth} auth
 * @constructor
 */
function ProxyConnection(browserConnection, janusConnection, auth) {
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
  this.auth = auth;
  this.transactions = {};
  this.plugins = {};

}

util.inherits(ProxyConnection, EventEmitter);

ProxyConnection.prototype.enableProxy = function() {
  var self = this;
  self.browserConnection.on('message', function(data) {
    var message = JSON.parse(data);
    logger.debug('to janus: ', message);
    self.auth.authorizeConnection(self, message.token).then(function() {
      if (self.auth.isValidConnection(self) && self.isValidMessage(message)) {
        self.handleMessage(message);
        self.janusConnection.send(data);
      } else {
        self.browserConnection.close();
      }
    });
  });

  self.browserConnection.on('close', function() {
    self.janusConnection.close();
  });

  self.janusConnection.on('message', function(data, flags) {
    var message = JSON.parse(data);
    logger.debug('from janus: ', message);
    if (self.auth.isValidConnection(self) && self.isValidMessage(message)) {
      self.handleMessage(message);
      self.browserConnection.send(data);
    } else {
      self.browserConnection.close();
    }
  });

  self.janusConnection.on('close', function() {
    // TODO: shall we close connectionBrowser, or recreate connectionJanus
  });
};

/**
 * @param {Object} message
 * @returns {Boolean}
 */
ProxyConnection.prototype.isValidMessage = function(message) {
  var pluginId = this._extractPlugin(message);
  if (pluginId) {
    return this._isValidMessagePlugin(message, pluginId);
  } else {
    return this._isValidMessageNoPlugin(message);
  }
};

ProxyConnection.prototype._extractPlugin = function(message) {
  return message['handle_id'] || message['sender'];
};

ProxyConnection.prototype._isValidMessagePlugin = function(message, pluginId) {
  return !!this.plugins[pluginId];
};

ProxyConnection.prototype._isValidMessageNoPlugin = function(message) {
  var eventName = message['janus'];
  var legalEventList = ['create', 'success', 'error', 'attach', 'trickle', 'ack', 'keepalive'];
  if (!_.contains(legalEventList, eventName)) {
    return false;
  }
  if ('attach' == eventName) {
    var pluginName = message['plugin'];
    var legalPluginList = ['janus.plugin.streaming', 'janus.plugin.audiobridge'];
    if (!_.contains(legalPluginList, pluginName)) {
      return false;
    }
  }
  return true;
};

/**
 * @param {Object} message
 */
ProxyConnection.prototype.handleMessage = function(message) {
  var eventName = message['janus'];
  var isTransaction = !!message['transaction'];

  if (!isTransaction) {
    this.emitEvent(eventName, message, null);
  }

  if (isTransaction) {
    var transactionId = message['transaction'];
    var transaction = this.transactions[transactionId] || null;
    if (!transaction) {
      this.transactions[transactionId] = {
        id: transactionId,
        eventName: eventName,
        request: message
      };
    } else if ('ack' != eventName) {
      delete this.transactions[transactionId];
      this.emitEvent(transaction.eventName, transaction.request, message);
    }
  }
};

/**
 * @param {String} eventName
 * @param {Object} request
 * @param {Object} response
 */
ProxyConnection.prototype.emitEvent = function(eventName, request, response) {
  logger.debug('event triggered', eventName);
  this.emit(eventName, request, response);
  var plugin = this.plugins[request.sender] || null;
  if (plugin) {
    plugin.emit(eventName, request, response);
  }
};

/**
 * @param {Plugin} plugin
 */
ProxyConnection.prototype.attachPlugin = function(plugin) {
  this.plugins[plugin.id] = plugin;
};

/**
 * @param {Plugin} plugin
 */
ProxyConnection.prototype.detachPlugin = function(plugin) {
  delete this.plugins[plugin.id];
};

module.exports = ProxyConnection;
