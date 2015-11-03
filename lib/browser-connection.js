var Connection = require('./connection.js');
var util = require('util');
var auth = require('./auth');
var logger = require('./logger');


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
      logger.info('Browser message refused. Invalid token: ' + token);
    });
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
    logger.info('Message to browser not sent. Invalid connection.');
    return Promise.reject();
  }
};

module.exports = BrowserConnection;
