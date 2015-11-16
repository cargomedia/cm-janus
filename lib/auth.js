var _ = require('underscore');
var Promise = require('bluebird');
var serviceLocator = require('./service-locator');

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
 * @param {String} data
 */
Auth.prototype.authorizeConnection = function(connection, data) {
  if (this.isValidConnection(connection)) {
    return Promise.resolve();
  }
  var self = this;
  return this._authenticate(data).then(function() {
    self._validConnections.push(connection);
  });
};

/**
 * @param {String} data
 * @returns {Promise}
 */
Auth.prototype._authenticate = function(data) {
  return serviceLocator.get('cm-api-client').isValidUser(data);
};

module.exports = Auth;
