var _ = require('underscore');

function Auth() {
  this.connections = [];
}

Auth.prototype.isValidConnection = function(connection) {
  return _.some(this.connections, connection);
};

Auth.prototype.authorizeConnection = function(connection, sessionId) {
  if (this.isValidConnection(connection)) {
    return;
  }
  if (this.authenticate(sessionId)) {
    this.connections.push(connection);
  }
};

Auth.prototype.authenticate = function(sessionId) {
  // do rpc call to CM app and return boolean depending if user exists
  return true;
};

module.exports = Auth;
