var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('ws');
var util = require('util');

/**
 * @param {ServiceLocator} serviceLocator
 * @param {String} identifier
 * @param {WebSocket} webSocket
 * @constructor
 */
function Connection(serviceLocator, identifier, webSocket) {
  var self = this;
  this.serviceLocator = serviceLocator;
  this.identifier = identifier;

  this.webSocket = webSocket;
  this.webSocket.on('message', function(data) {
    var message = JSON.parse(data);
    self.serviceLocator.get('logger').debug('<- ' + this.identifier, message);
    this._onMessage(message);
  }.bind(this));

  this.webSocket.on('close', function() {
    this.emit.apply(this, arguments);
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
  this.webSocket.send(JSON.stringify(message));
  this.serviceLocator.get('logger').debug('-> ' + this.identifier, message);
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @private
 */
Connection.prototype._onMessage = function(message) {
  try {
    this.emit('message', message);
  } catch (e) {
    this.serviceLocator.get('logger').error(e, e.stack);
  }
};

module.exports = Connection;
