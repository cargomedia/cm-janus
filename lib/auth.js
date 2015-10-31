var _ = require('underscore');
var Promise = require('bluebird');

function Auth() {
  this._validConnections = [];
}

/**
 * @param {BrowserConnection} connection
 */
Auth.prototype.isValidConnection = function(connection) {
  return _.some(this._validConnections, connection);
};

/**
 * @param {BrowserConnection} connection
 * @param {String} sessionId
 */
Auth.prototype.authorizeConnection = function(connection, sessionId) {
  if (this.isValidConnection(connection)) {
    return Promise.resolve();
  }
  var self = this;
  return this._authenticate(sessionId).then(function() {
    self._validConnections.push(connection);
  })
};

/**
 * @param {String} sessionId
 * @returns {Promise}
 */
Auth.prototype._authenticate = function(sessionId) {
  // do rpc call to CM app and return boolean depending if user exists
  return Promise.resolve();
};

module.exports = new Auth();
