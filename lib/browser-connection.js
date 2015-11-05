var Connection = require('./connection.js');
var util = require('util');
var auth = require('./auth');
var logger = require('./logger');
var JanusError = require('./janus-error');


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
  auth.authorizeConnection(this, token)
    .then(function() {
      BrowserConnection.super_.prototype._onMessage.call(this, message);
    }.bind(this))
    .catch(function() {
      var error = new JanusError.Unauthorized(message['transaction']);
      BrowserConnection.super_.prototype._send.call(this, error.response);
      logger.info('Browser message refused. Invalid token: ' + token);
    }.bind(this));
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
BrowserConnection.prototype._send = function(message) {
  if (auth.isValidConnection(this)) {
    return BrowserConnection.super_.prototype._send.call(this, message);
  } else {
    var error = new JanusError.Unauthorized(message['transaction']);
    BrowserConnection.super_.prototype._send.call(this, error.response);
    logger.info('Message to browser not sent. Invalid connection.');
    return Promise.reject();
  }
};

module.exports = BrowserConnection;
