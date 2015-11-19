var assert = require('chai').assert;
var HttpServer = require('../../lib/http-server');
var sinon = require('sinon');
var Promise = require('bluebird');

describe('Http Server alone', function() {
  it('is created properly and starts', function(done) {
    var serviceLocator = require('../../lib/service-locator.js');

    var logger = {
      debug: function() {
      }
    };

    var loggerSpy = sinon.spy(logger, 'debug');
    serviceLocator.register('logger', function() {
      return logger;
    });

    var port = 8811;
    var apiKey = 'fooKey';

    var httpServer = new HttpServer(port, apiKey);

    assert.instanceOf(httpServer, HttpServer);
    assert.strictEqual(httpServer.port, port);
    assert.strictEqual(httpServer.apiKey, apiKey);

    httpServer.start().then(function() {
      assert.isTrue(loggerSpy.calledOnce);
      done();
    });
  });

  it('fails without apiKey', function() {
    assert.throw(function() {
      new HttpServer(8811);
    }, /apiKey is not defined/);
  });

});
