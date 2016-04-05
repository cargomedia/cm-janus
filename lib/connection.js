var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('ws');
var util = require('util');
var url = require('url');

var serviceLocator = require('./service-locator');


/**
 * @param {String} identifier
 * @param {WebSocket} webSocket
 * @constructor
 */
function Connection(identifier, webSocket) {
  this.identifier = identifier;

  this.webSocket = webSocket;
  this.webSocket.on('message', function(data) {
    var message;
    try {
      message = JSON.parse(data);
      serviceLocator.get('logger').debug('<- ' + this.identifier, {request: message});
      this._onMessage(message);
    } catch (error) {
      this.emit('error', error);
    }
  }.bind(this));

  this.webSocket.on('error', function(error) {
    this.emit('error', error);
  }.bind(this));

  this.webSocket.on('close', function() {
    this.emit('close');
  }.bind(this));
}

util.inherits(Connection, EventEmitter);

Connection.prototype.close = function() {
  this.webSocket.terminate();
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
  return new Promise(function(resolve) {
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
  serviceLocator.get('logger').debug('-> ' + this.identifier, {request: message});
  return new Promise(function(resolve, reject) {
    this.webSocket.send(JSON.stringify(message), {}, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }.bind(this));
};

/**
 * @param {Object} message
 * @private
 */
Connection.prototype._onMessage = function(message) {
  try {
    this.emit('message', message);
  } catch (error) {
    this.emit('error', error);
  }
};

/**
 * @returns {String}
 */
Connection.prototype.getUrl = function() {
  return this.webSocket.upgradeReq.url;
}

/**
 * @returns {Object}
 */
Connection.prototype.getUrlObject = function() {
  return url.parse(this.getUrl(), true);
};

module.exports = Connection;
