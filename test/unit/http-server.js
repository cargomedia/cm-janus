var assert = require('chai').assert;
var HttpServer = require('../../lib/http-server');
var sinon = require('sinon');
var Promise = require('bluebird');
var serviceLocator = require('../../lib/service-locator.js');
var requestPromise = require('request-promise');

describe('Http Server', function() {
  var port = 8811;
  var apiKey = 'fooKey';
  var streamList = [
    {id: 1, channelName: 'foo'},
    {id: 20, channelName: 'bar'}
  ];

  function getOptions(method, path, apiKey, data) {
    return {
      method: method,
      uri: 'http://localhost:' + '8811' + '/' + path,
      params: data,
      headers: {'Server-Key': apiKey},
      json: true
    };
  }

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
    });
    serviceLocator.register('streams', function() {
      return {
        list: streamList
      }
    });
  });

  after(function() {
    serviceLocator.reset();
  });

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

      requests['authFail'] = requestPromise(getOptions('POST', 'stopStream', 'wrongKey', {})).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err['statusCode'], 403);
      });

      requests['status'] = requestPromise(getOptions('GET', 'status', apiKey, {})).then(function(res) {
        assert.isArray(res);
        assert.lengthOf(res, 2);
        assert.deepEqual(res, streamList);
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
