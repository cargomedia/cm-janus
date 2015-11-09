var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('ws');
var logger = require('./logger');
var util = require('util');

/**
 * @param {String} identifier
 * @param {WebSocket} webSocket
 * @constructor
 */
function Connection(identifier, webSocket) {
  this.identifier = identifier;
  this._waitingForResponse = false;

  this.webSocket = webSocket;
  this.webSocket.on('message', function(data) {
    var message = JSON.parse(data);
    this._onMessage(message);
  }.bind(this));

  this.webSocket.on('close', function() {
    this.emit.call(this, 'close');
  }.bind(this));
}

util.inherits(Connection, EventEmitter);

Connection.prototype.close = function() {
  this.webSocket.close();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Connection.prototype.send = function(message) {
  if (this.isOpened()) {
    return this._send(message);
  } else {
    return this._queue(message);
  }
};

/**
 * @returns {Boolean}
 */
Connection.prototype.isOpened = function() {
  return WebSocket.OPEN === this.webSocket.readyState;
};

/**
 * @returns {Number} webSocketStatus
 */
Connection.prototype.getStatus = function() {
  return this.webSocket.readyState;
};

/**
 * @returns {String}
 */
Connection.prototype.generateTransactionId = function() {
  return Math.random().toString(36).substring(2, 12);
};

Connection.prototype.isWaitingForResponse = function() {
  return this._waitingForResponse;
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
Connection.prototype._queue = function(message) {
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
Connection.prototype._send = function(message) {
  this._waitingForResponse = true;
  this.webSocket.send(JSON.stringify(message));
  logger.debug('-> ' + this.identifier, message);
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @private
 */
Connection.prototype._onMessage = function(message) {
  try {
    this._waitingForResponse = false;
    logger.debug('<- ' + this.identifier, message);
    this.emit('message', message);
  } catch (e) {
    logger.error(e, e.stack);
  }
};

module.exports = Connection;
