var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
var requestPromise = require('request-promise');

var serviceLocator = require('../../lib/service-locator.js');
var HttpServer = require('../../lib/http-server');
var Logger = require('../../lib/logger');

describe('Http Server', function() {
  var port = 8811;
  var apiKey = 'fooKey';
  var streamList = [
    {id: 1, channelName: 'foo'},
    {id: 2, channelName: 'bar'},
    {id: 20, channelName: 'baz'}
  ];
  var proxyConnection = {
    stopStream: function() {
    }
  };
  var stream = {
    proxyConnection: proxyConnection
  };
  var stopStreamStub = sinon.stub(proxyConnection, 'stopStream');
  stopStreamStub.withArgs(1).returns(Promise.resolve());
  stopStreamStub.withArgs(2).returns(Promise.reject());

  //mocked Streams
  var streams = {
    list: streamList,
    find: function(streamId) {
      if (['1', '2'].indexOf(streamId) != -1) {
        return stream;
      }
      return null;
    }
  };

  var findSpy = sinon.spy(streams, 'find');

  function getOptions(method, path, apiKey, data) {
    return {
      method: method,
      uri: 'http://localhost:' + '8811' + '/' + path,
      body: data,
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
      return streams;
    });
  });

  after(function() {
    serviceLocator.reset();
  });

  it('is created properly and starts', function(done) {

    var httpServer = new HttpServer(port, apiKey);

    assert.instanceOf(httpServer, HttpServer);
    assert.strictEqual(httpServer.port, port);
    assert.strictEqual(httpServer.apiKey, apiKey);

    httpServer.start().then(function() {
      var requests = [];

      requests['statusAuthFail'] = requestPromise(getOptions('GET', 'status', 'wrongKey', {})).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err['statusCode'], 403);
      });

      requests['statusOK'] = requestPromise(getOptions('GET', 'status', apiKey, {})).then(function(res) {
        assert.isArray(res);
        assert.lengthOf(res, 3);
        assert.deepEqual(res, streamList);
      });

      requests['stopStreamAuthFail'] = requestPromise(getOptions('POST', 'stopStream', 'wrongKey', {})).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err['statusCode'], 403);
      });

      requests['stopStreamNotFound'] = requestPromise(getOptions('POST', 'stopStream', apiKey, {streamId: 222})).then(function(res) {
        assert.isTrue(findSpy.calledOnce);
        assert.deepEqual(res, {error: 'Unknown stream: 222'});
      });

      Promise.all(requests).finally(function() {
        done();
      });
    });
  });

  it('fails without apiKey', function() {
    assert.throw(function() {
      new HttpServer(8811);
    }, /apiKey is not defined/);
  });
});
