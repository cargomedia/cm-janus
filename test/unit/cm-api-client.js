var assert = require('chai').assert;
require('../helpers/globals');
var CMApiClient = require('../../lib/cm-api-client');
var Stream = require('../../lib/stream');
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
    var action = 'foo';
    var sentData = ['bar', 'baz'];

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

  describe('publish()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var channelMediaId = 'media-id';
    var channelName = 'scKey';
    var streamKey = 'stKey';
    var sessionData = 'session-data';
    var channelData = 'channel-data';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));

      var plugin = {session: {data: sessionData}};
      var channel = {id: channelMediaId, name: channelName, data: channelData};
      var stream = new Stream(streamKey, channel, plugin);
      cmApiClient.publish(stream);
      assert.isTrue(requestStub.withArgs('publish', [sessionData, channelName, channelMediaId, channelData, streamKey, stream.start.getTime() / 1000]).calledOnce);
      requestStub.restore();
    });
  });

  describe('subscribe()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var channelMediaId = 'media-id';
    var channelName = 'scKey';
    var streamKey = 'stKey';
    var sessionData = 'session-data';
    var channelData = 'channel-data';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));
      var plugin = {session: {data: sessionData}};
      var channel = {id: channelMediaId, name: channelName, data: channelData};
      var stream = new Stream(streamKey, channel, plugin);
      cmApiClient.subscribe(stream);
      assert.isTrue(requestStub.withArgs('subscribe', [sessionData, channelName, channelMediaId, channelData, streamKey, stream.start.getTime() / 1000]).calledOnce);
      requestStub.restore();
    });
  });

  describe('removeStream()', function() {
    var cmApiClient = new CMApiClient('http://cm.dev/', 'apiKey');
    var streamChannelKey = 'scKey';
    var streamKey = 'stKey';

    it('passes params to request correctly', function() {
      var requestStub = sinon.stub(cmApiClient, '_request').returns(Promise.resolve(true));
      var channel = {name: streamChannelKey};
      var stream = new Stream(streamKey, channel);
      cmApiClient.removeStream(stream);
      assert.isTrue(requestStub.withArgs('removeStream', [streamChannelKey, streamKey]).calledOnce);
      requestStub.restore();
    });
  });
});
