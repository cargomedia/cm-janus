var Connection = require('./connection.js');
var JanusError = require('./janus-error');
var util = require('util');

var serviceLocator = require('./service-locator');


function BrowserConnection(webSocket) {
  BrowserConnection.super_.call(this, 'browser', webSocket);
}

util.inherits(BrowserConnection, Connection);

/**
 * @param {Object} message
 * @private
 */
BrowserConnection.prototype._onMessage = function(message) {
  var token = message['token'];
  serviceLocator.get('auth').authorizeConnection(this, token)
    .then(function() {
      BrowserConnection.super_.prototype._onMessage.call(this, message);
    }.bind(this))
    .catch(function() {
      var error = new JanusError.Unauthorized(message['transaction']);
      BrowserConnection.super_.prototype._send.call(this, error.response);
      serviceLocator.get('logger').info('Browser message refused. Invalid token: ' + token);
    }.bind(this));
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
BrowserConnection.prototype._send = function(message) {
  if (serviceLocator.get('auth').isValidConnection(this)) {
    return BrowserConnection.super_.prototype._send.call(this, message);
  } else {
    var error = new JanusError.Unauthorized(message['transaction']);
    BrowserConnection.super_.prototype._send.call(this, error.response);
    serviceLocator.get('logger').info('Message to browser not sent. Invalid connection.');
    return Promise.reject();
  }
};

module.exports = BrowserConnection;
