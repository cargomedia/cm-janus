var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
var _ = require('underscore');
require('../helpers/global-error-handler');
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
    stopStream: function(streamId) {
    }
  };
  var stopStreamStub = sinon.stub(proxyConnection, 'stopStream', function(streamId) {
    if (streamId == '1') {
      return Promise.resolve();
    }
    else if (streamId == '2') {
      return Promise.reject();
    }
    else {
      throw new Error('Wrong stub call');
    }
  });

  //mocked Streams
  var streams = {
    list: streamList,
    find: function(streamId) {
      if (['1', '2'].indexOf(streamId) != -1) {
        return {
          proxyConnection: proxyConnection,
          id: streamId
        };
      }
      return null;
    }
  };

  var findSpy = sinon.spy(streams, 'find');

  function getOptions(method, path, apiKey, data) {
    return {
      method: method,
      uri: 'http://localhost:' + port + '/' + path,
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

  it('is created properly, starts and responds well', function(done) {

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
        assert.deepEqual(res, streamList);
      });

      requests['stopStreamAuthFail'] = requestPromise(getOptions('POST', 'stopStream', 'wrongKey', {})).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err['statusCode'], 403);
      });

      requests['stopStreamNotFound'] = requestPromise(getOptions('POST', 'stopStream', apiKey, {streamId: 222})).then(function(res) {
        assert.deepEqual(res, {error: 'Unknown stream: 222'});
        assert.isTrue(findSpy.withArgs('222').calledOnce);
      });

      requests['stopStreamOK'] = requestPromise(getOptions('POST', 'stopStream', apiKey, {streamId: 1})).then(function(res) {
        assert.deepEqual(res, {success: 'Stream stopped'});
        assert.isTrue(findSpy.withArgs('1').calledOnce);
        assert.isTrue(stopStreamStub.withArgs('1').calledOnce);
      });

      requests['stopStreamFail'] = requestPromise(getOptions('POST', 'stopStream', apiKey, {streamId: 2})).then(function(res) {
        assert.deepEqual(res, {error: 'Stream stop failed'});
        assert.isTrue(findSpy.withArgs('2').calledOnce);
        assert.isTrue(stopStreamStub.withArgs('2').calledOnce);
      });

      Promise.all(_.values(requests)).finally(function() {
        assert.strictEqual(findSpy.callCount, 3);
        assert.strictEqual(stopStreamStub.callCount, 2);
        done();
      });
    });
  });

  it('fails without apiKey', function() {
    assert.throw(function() {
      new HttpServer(port);
    }, /apiKey is not defined/);
  });
});
