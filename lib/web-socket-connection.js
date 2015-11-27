var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('ws');
var util = require('util');


var serviceLocator = require('./service-locator');


/**
 * @param {String} name
 * @param {WebSocket} webSocket
 * @constructor
 */
function WebSocketConnection(name, webSocket) {
  this.identifier = name;

  this.webSocket = webSocket;
  this.webSocket.on('message', function(data) {
    var message = JSON.parse(data);
    serviceLocator.get('logger').debug('<- ' + this.identifier, message);
    this._onMessage(message);
  }.bind(this));

  this.webSocket.on('close', function() {
    this.emit.apply(this, arguments);
  }.bind(this));
}

util.inherits(WebSocketConnection, EventEmitter);

WebSocketConnection.prototype.close = function() {
  this.webSocket.close();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
WebSocketConnection.prototype.send = function(message) {
  if (this.isOpened()) {
    return this._send(message);
  } else {
    return this._queue(message);
  }
};

/**
 * @returns {Boolean}
 */
WebSocketConnection.prototype.isOpened = function() {
  return WebSocket.OPEN === this.webSocket.readyState;
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
WebSocketConnection.prototype._queue = function(message) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.webSocket.once('open', function() {
      self._send(message).then(function(response) {
        resolve(response);
      });
    });
  });
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
WebSocketConnection.prototype._send = function(message) {
  this.webSocket.send(JSON.stringify(message));
  serviceLocator.get('logger').debug('-> ' + this.identifier, message);
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @private
 */
WebSocketConnection.prototype._onMessage = function(message) {
  try {
    this.emit('message', message);
  } catch (e) {
    serviceLocator.get('logger').error(e, e.stack);
  }
};

/**
 *
 * @param {String} name
 * @param {String} address
 * @param {String} protocol
 * @returns {WebSocketConnection}
 */
WebSocketConnection.open = function(name, address, protocol) {
  var webSocket = new WebSocket(address, protocol)
  return new WebSocketConnection(name, webSocket);
}

module.exports = WebSocketConnection;
