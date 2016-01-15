var assert = require('chai').assert;
var nock = require('nock');
require('../helpers/globals');
var Stream = require('../../lib/stream');

var CmApiClient = require('../../lib/cm-api-client');

describe('CmApiClient spec tests', function() {

  this.timeout(2000);

  function mockRequest(url, action, apiKey, params) {
    nock(url)
      .post('/', function(body) {
        assert.equal(body['method'], 'CM_Janus_RpcEndpoints.' + action);
        assert.deepEqual(body['params'], [apiKey].concat(params));
        return true;
      })
      .reply(200, {
        success: {result: true}
      });
  }

  it('publish', function(done) {
    var url = 'http://localhost:8080';
    var action = 'publish';
    var apiKey = 'test';
    var plugin = {session: {data: 'sessionData'}};
    var channel = {id: 'channelMediaId', name: 'channelKey', data: 'channelData'};
    var stream = new Stream('streamKey', channel, plugin);
    var params = [stream];

    var httpParams = ['sessionData', 'channelKey', 'channelMediaId', 'channelData', 'streamKey', stream.start.getTime() / 1000];

    mockRequest(url, action, apiKey, httpParams);

    var client = new CmApiClient(url, apiKey);
    client.publish.apply(client, params).then(function(result) {
      assert.isTrue(result);
      done();
    });
  });

  it('subscribe', function(done) {
    var url = 'http://localhost:8080';
    var action = 'subscribe';
    var apiKey = 'test';
    var plugin = {session: {data: 'sessionData'}};
    var channel = {id: 'channelMediaId', name: 'channelKey', data: 'channelData'};
    var stream = new Stream('streamKey', channel, plugin);
    var params = [stream];
    var httpParams = ['sessionData', 'channelKey', 'channelMediaId', 'channelData', 'streamKey', stream.start.getTime() / 1000];

    mockRequest(url, action, apiKey, httpParams);

    var client = new CmApiClient(url, apiKey);
    client.subscribe.apply(client, params).then(function(result) {
      assert.isTrue(result);
      done();
    });
  });

  it('removeStream', function(done) {
    var url = 'http://localhost:8080';
    var action = 'removeStream';
    var apiKey = 'test';
    var channel = {name: 'streamChannelKey', data: 'channelData'};
    var stream = new Stream('streamKey', channel);
    var params = [stream];
    var httpParams = ['streamChannelKey', 'streamKey'];

    mockRequest(url, action, apiKey, httpParams);

    var client = new CmApiClient(url, apiKey);
    client.removeStream.apply(client, params).then(function(result) {
      assert.isTrue(result);
      done();
    });
  });
});
