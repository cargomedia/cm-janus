var assert = require('chai').assert;
var CMApiClient = require('../../lib/cm-api-client');
var Promise = require('bluebird');
var sinon = require('sinon');

describe('cm-api-client', function() {

  this.timeout(100);

  it('is created properly', function() {
    var baseUrl = 'http://cm.dev/';
    var apiKey = 'foo';
    var cmHttpClient = new CMApiClient(baseUrl, apiKey);

    assert.instanceOf(cmHttpClient, CMApiClient, 'has proper type');
    assert.strictEqual(cmHttpClient.baseUrl, baseUrl, 'has proper baseUrl');
    assert.strictEqual(cmHttpClient.apiKey, apiKey, 'has proper apiKey');
  });

  describe('_request()', function() {
    var baseUri = 'http://cm.dev/';
    var apiKey = 'fooKey';
    var cmHttpClient = new CMApiClient(baseUri, apiKey);
    var serviceLocator = require('../../lib/service-locator.js');

    var logger = {
      info: function() {
      }
    };

    var loggerSpy = sinon.spy(logger, 'info');
    serviceLocator.register('logger', function() {
      return logger;
    });

    var action = 'foo';
    var sentData = ['bar', 'baz'];

    it('works with successful response', function(done) {
      var requestPromiseMock = sinon.stub(cmHttpClient, '_httpClient').returns(
        function(options) {
          assert.deepEqual(options, {
            method: 'POST',
            uri: baseUri,
            body: {
              method: 'CM_Janus_RpcEndpoints.' + action,
              params: [apiKey].concat(sentData)
            },
            json: true
          }, 'invoked with proper params');
          return Promise.resolve({body: 'body', success: {result: 'quux'}});
        }
      );

      cmHttpClient._request(action, sentData).then(function(res) {
        assert.strictEqual(res, 'quux');
        assert.isTrue(loggerSpy.calledTwice);
        assert.isTrue(loggerSpy.getCall(0).calledWith('cm-api', 'request', baseUri));
        assert.isTrue(loggerSpy.getCall(1).calledWith('cm-api', 'response', 'body'));
        assert.isTrue(requestPromiseMock.calledOnce);
        requestPromiseMock.restore();
        done();
      });
    });

    it('works with response with error', function(done) {
      var requestPromiseMock = sinon.stub(cmHttpClient, '_httpClient').returns(
        function() {
          return Promise.resolve({body: 'bodyErr', error: {msg: 'disaster'}});
        }
      );

      cmHttpClient._request(action, sentData).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, 'cm-api error: disaster');
        assert.strictEqual(loggerSpy.callCount, 4);
        assert.isTrue(loggerSpy.getCall(2).calledWith('cm-api', 'request', baseUri));
        assert.isTrue(loggerSpy.getCall(3).calledWith('cm-api', 'response', 'bodyErr'));
        assert.isTrue(requestPromiseMock.calledOnce);
        requestPromiseMock.restore();
        done();
      });
    });

    it('works with completely failed request', function(done) {
      var requestPromiseMock = sinon.stub(cmHttpClient, '_httpClient').returns(
        function() {
          return Promise.reject(new Error('request failed'));
        }
      );

      cmHttpClient._request(action, sentData).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, 'cm-api error: request failed');
        assert.strictEqual(loggerSpy.callCount, 5);
        assert.isTrue(loggerSpy.getCall(4).calledWith('cm-api', 'request', baseUri));
        assert.isTrue(requestPromiseMock.calledOnce);
        requestPromiseMock.restore();
        done();
      });
    });
  });

  describe('isValidUser()', function() {
    var cmHttpClient = new CMApiClient('http://cm.dev/', 'foo');
    var userData = {foo: 'bar'};

    it('works when returns true', function() {
      var successStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(true));
      cmHttpClient.isValidUser(userData);
      assert.isTrue(successStub.withArgs('isValidUser', [userData]).calledOnce);
      successStub.restore();
    });

    it('works when returns false', function(done) {
      var failStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(false));
      cmHttpClient.isValidUser(userData).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, 'Not valid user');
        assert.isTrue(failStub.withArgs('isValidUser', [userData]).calledOnce);
        done();
      });
    });
  });

  describe('publish()', function() {
    var cmHttpClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';
    var start = 123;
    var userData = {foo: 'bar'};

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(true));
      cmHttpClient.publish(streamChannelKey, streamKey, start, userData);
      assert.isTrue(requestStub.withArgs('publish', [streamChannelKey, streamKey, start, userData]).calledOnce);
      requestStub.restore();
    });
  });

  describe('subscribe()', function() {
    var cmHttpClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';
    var start = 123;
    var userData = {foo: 'bar'};

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(true));
      cmHttpClient.subscribe(streamChannelKey, streamKey, start, userData);
      assert.isTrue(requestStub.withArgs('subscribe', [streamChannelKey, streamKey, start, userData]).calledOnce);
      requestStub.restore();
    });
  });

  describe('removeStream()', function() {
    var cmHttpClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(true));
      cmHttpClient.removeStream(streamChannelKey, streamKey);
      assert.isTrue(requestStub.withArgs('removeStream', [streamChannelKey, streamKey]).calledOnce);
      requestStub.restore();
    });
  });
});
