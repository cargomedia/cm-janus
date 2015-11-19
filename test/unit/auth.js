var assert = require('chai').assert;
var Auth = require('../../lib/auth');
var Promise = require('bluebird');
var ServiceLocator = require('../../lib/service-locator');

describe('auth', function() {

    it('authorizeConnection', function() {
    var auth = new Auth(new ServiceLocator());
    auth.isValidConnection = function(connection) {
      return false;
    };
    auth._authenticate = function(sessionId) {
      return Promise.resolve();
    };
    assert.lengthOf(auth._validConnections, 0);
    auth.authorizeConnection('foo', 'bar').then(function() {
      assert.equal(auth._validConnections[0], 'foo');
    });
  });
});
