var assert = require('chai').assert;
require('../helpers/global-error-handler');
var Logger = require('../../lib/logger');
var CMApiClient = require('../../lib/cm-api-client');
var Promise = require('bluebird');
var sinon = require('sinon');

describe('CmApiClient unit tests', function() {

  this.timeout(1000);

  it('is created properly', function() {
    var baseUrl = 'http://cm.dev/';
    var apiKey = 'foo';
    var cmApiClient = new CMApiClient(baseUrl, apiKey);

    assert.instanceOf(cmApiClient, CMApiClient, 'has proper type');
    assert.strictEqual(cmApiClient.baseUrl, baseUrl, 'has proper baseUrl');
    assert.strictEqual(cmApiClient.apiKey, apiKey, 'has proper apiKey');
  });

  describe('_request()', function() {
    var baseUri = 'http://cm.dev/';
    var apiKey = 'fooKey';
    var cmApiClient = new CMApiClient(baseUri, apiKey);
    var serviceLocator = require('../../lib/service-locator.js');
    var action = 'foo';
    var sentData = ['bar', 'baz'];

    before(function() {
      serviceLocator.reset();
      serviceLocator.register('logger', function() {
        return new Logger();
      });
    });

    after(function() {
      serviceLocator.reset();
    });

    it('works with successful response', function(done) {
      var requestPromiseMock = sinon.stub(cmApiClient, '_requestPromise', function(options) {
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
      });

      cmApiClient._request(action, sentData).then(function(res) {
        assert.strictEqual(res, 'quux');
        assert.isTrue(requestPromiseMock.calledOnce);
        done();
      });
      requestPromiseMock.restore();
    });

    it('works with response with error', function(done) {
      var requestPromiseMock = sinon.stub(cmApiClient, '_requestPromise', function() {
        return Promise.resolve({body: 'bodyErr', error: {msg: 'msg', type: 'type'}});
      });

      cmApiClient._request(action, sentData).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, 'cm-api error: type. msg');
        assert.isTrue(requestPromiseMock.calledOnce);
        done();
      });
      requestPromiseMock.restore();
    });

    it('works with completely failed request', function(done) {
      var requestPromiseMock = sinon.stub(cmApiClient, '_requestPromise', function() {
        return Promise.reject(new Error('request failed'));
      });

      cmApiClient._request(action, sentData).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, 'cm-api error: request failed');
        assert.isTrue(requestPromiseMock.calledOnce);
        done();
      });
      requestPromiseMock.restore();
    });
  });

  describe('isValidUser()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'foo');
    var userData = {foo: 'bar'};

    it('works when returns true', function() {
      var successStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));
      cmApiClient.isValidUser(userData);
      assert.isTrue(successStub.withArgs('isValidUser', [userData]).calledOnce);
      successStub.restore();
    });

    it('works when returns false', function(done) {
      var failStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(false));
      cmApiClient.isValidUser(userData).catch(function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, 'Not valid user');
        assert.isTrue(failStub.withArgs('isValidUser', [userData]).calledOnce);
        done();
      });
    });
  });

  describe('publish()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';
    var start = 123;
    var sessionData = '{"foo": "bar"}';
    var channelData = 'channelData';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));
      cmApiClient.publish(streamChannelKey, streamKey, start, sessionData, channelData);
      assert.isTrue(requestStub.withArgs('publish', [streamChannelKey, streamKey, start, sessionData, channelData]).calledOnce);
      requestStub.restore();
    });
  });

  describe('subscribe()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';
    var start = 123;
    var userData = '{"foo": "bar"}';
    var channelData = '{"baz": "quux"}';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));
      cmApiClient.subscribe(streamChannelKey, streamKey, start, userData, channelData);
      assert.isTrue(requestStub.withArgs('subscribe', [streamChannelKey, streamKey, start, userData, channelData]).calledOnce);
      requestStub.restore();
    });
  });

  describe('removeStream()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));
      cmApiClient.removeStream(streamChannelKey, streamKey);
      assert.isTrue(requestStub.withArgs('removeStream', [streamChannelKey, streamKey]).calledOnce);
      requestStub.restore();
    });
  });
});
