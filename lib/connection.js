var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('ws');
var logger = require('./logger');

/**
 * @param {String} identifier
 * @param {WebSocket} webSocket
 * @constructor
 */
function Connection(identifier, webSocket) {
  this.identifier = identifier;
  this.pendingTransactions = {};

  this.webSocket = webSocket;
  this.webSocket.on('message', function(data) {
    var message = JSON.parse(data);
    this._onMessage(message);
  }.bind(this));

}

util.inherits(Connection, EventEmitter);

/**
 * @param {Object} message
 * @returns {Promise}
 */
Connection.prototype.send = function(message) {
  if (WebSocket.OPEN === this.webSocket.readyState) {
    return this._send(message);
  } else {
    return this._queue(message);
  }
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
  var promise;

  if (!message.transaction) {
    promise = Promise.resolve();

  } else {
    promise = new Promise(function(resolve, reject) {
      var transactionId = message.transaction;
      this.pendingTransactions[transactionId] = resolve;
    }.bind(this));
  }

  this.webSocket.send(JSON.stringify(message));
  logger.debug('-> ' + this.identifier, message);
  return promise;
};

/**
 * @param {Object} message
 * @private
 */
Connection.prototype._onMessage = function(message) {
  if (!message['janus']) {
    throw new Error('Invalid message: no janus property');
  }
  logger.debug('<- ' + this.identifier, message);
  if (message.transaction) {
    var pendingTransaction = this.pendingTransactions[message.transaction] || null;
    if (pendingTransaction) {
      pendingTransaction(message);
      delete this.pendingTransactions[message.transaction];
    }
  }
  this.emit('global', message);
};

module.exports = Connection;
