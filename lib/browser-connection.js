var Connection = require('./connection.js');
var JanusError = require('./janus-error');
var util = require('util');

/**
 * @param {ServiceLocator} serviceLocator
 * @constructor
 */
function BrowserConnection(serviceLocator, webSocket) {
  BrowserConnection.super_.call(this, serviceLocator, 'browser', webSocket);
}

util.inherits(BrowserConnection, Connection);

/**
 * @param {Object} message
 * @private
 */
BrowserConnection.prototype._onMessage = function(message) {
  var token = message['token'];
  this.serviceLocator.get('auth').authorizeConnection(this, token)
    .then(function() {
      BrowserConnection.super_.prototype._onMessage.call(this, message);
    }.bind(this))
    .catch(function() {
      var error = new JanusError.Unauthorized(message['transaction']);
      BrowserConnection.super_.prototype._send.call(this, error.response);
      this.serviceLocator.get('logger').info('Browser message refused. Invalid token: ' + token);
    }.bind(this));
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
BrowserConnection.prototype._send = function(message) {
  if (this.serviceLocator.get('auth').isValidConnection(this)) {
    return BrowserConnection.super_.prototype._send.call(this, message);
  } else {
    var error = new JanusError.Unauthorized(message['transaction']);
    BrowserConnection.super_.prototype._send.call(this, error.response);
    this.serviceLocator.get('logger').info('Message to browser not sent. Invalid connection.');
    return Promise.reject();
  }
};

module.exports = BrowserConnection;
