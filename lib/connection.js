var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('ws');
var logger = require('./logger');

/**
 * @param {WebSocket} webSocket
 * @constructor
 */
function Connection(webSocket) {
  this.identifier = 'UNDEFINED';
  this.events = new EventEmitter();
  this.pendingTransactions = {};

  this.webSocket = webSocket;
  this.webSocket.on('message', function(data) {
    var message = JSON.parse(data);
    this._onMessage(message);
  }.bind(this));

}

/**
 * @param {String} event
 * @param {Function} callback
 */
Connection.prototype.on = function(event, callback) {
  this.events.on(event, callback);
};

/**
 * @param {Object} message
 */
Connection.prototype.send = function(message) {
  if (WebSocket.OPEN === this.webSocket.readyState) {
    this._send(message);
  } else {
    this.webSocket.once('open', function() {
      this._send(message);
    }.bind(this));
  }
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
  logger.debug('<- ' + this.identifier, message);
  if (message.transaction) {
    var pendingTransaction = this.pendingTransactions[message.transaction] || null;
    if (pendingTransaction) {
      pendingTransaction(message);
      delete this.pendingTransactions[message.transaction];
    }
  }

  var eventName = message.janus;
  if (EventEmitter.listenerCount(this.events, eventName) > 0) {
    this.events.emit(eventName, message);
  } else {
    this.events.emit('unhandledMessage', message);
  }
};

module.exports = Connection;
