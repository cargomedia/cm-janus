var _ = require('underscore');

function Auth() {
  this.validConnections = [];
}

/**
 * @param {WebSocket} connection
 */
Auth.prototype.isValidConnection = function(connection) {
  return _.some(this.validConnections, connection);
};

/**
 * @param {WebSocket} connection
 * @param {String} sessionId
 */
Auth.prototype.authorizeConnection = function(connection, sessionId) {
  if (this.isValidConnection(connection)) {
    return;
  }
  if (this.authenticate(sessionId)) {
    this.validConnections.push(connection);
  }
};

/**
 * @param {String} sessionId
 * @returns {boolean}
 */
Auth.prototype.authenticate = function(sessionId) {
  // do rpc call to CM app and return boolean depending if user exists
  return true;
};

module.exports = Auth;
