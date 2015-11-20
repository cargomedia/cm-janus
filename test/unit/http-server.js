var assert = require('chai').assert;
var HttpServer = require('../../lib/http-server');
var sinon = require('sinon');
var Promise = require('bluebird');
var serviceLocator = require('../../lib/service-locator.js');
var requestPromise = require('request-promise');

describe('Http Server', function() {
  var port = 8811;
  var apiKey = 'fooKey';

  function getOptions(path, apiKey, data) {
    return {
      method: 'POST',
      uri: 'http://localhost:' + '8811' + '/' + path,
      params: data,
      headers: {'Server-Key': apiKey},
      json: true
    };
  }

  it('is created properly and starts', function(done) {

    var logger = {
      debug: function() {
      }
    };

    var loggerSpy = sinon.spy(logger, 'debug');
    serviceLocator.register('logger', function() {
      return logger;
    });

    var httpServer = new HttpServer(port, apiKey);

    assert.instanceOf(httpServer, HttpServer);
    assert.strictEqual(httpServer.port, port);
    assert.strictEqual(httpServer.apiKey, apiKey);

    httpServer.start().then(function() {
      assert.isTrue(loggerSpy.calledOnce);
    }).then(function() {
      var requests = [];

      requests['authFail'] = requestPromise(getOptions('stopStream', 'wrongKey', {})).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err['statusCode'], 403);
      });

      Promise.all(requests).finally(function() {
        done();
      });
    }).catch(function() {
      assert.fail(actual, expected);
    });
  });

  it('fails without apiKey', function() {
    assert.throw(function() {
      new HttpServer(8811);
    }, /apiKey is not defined/);
  });
});
