var assert = require('chai').assert;
var nock = require('nock');
require('../helpers/global-error-handler');
var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');

var CmApiClient = require('../../lib/cm-api-client');

describe('CmApiClient spec tests', function() {

  this.timeout(2000);

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
    });
  });

  after(function() {
    serviceLocator.reset();
  });

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
    var params = ['streamChannelKey', 'streamKey', 0, 'sessionData', 'data'];

    mockRequest(url, action, apiKey, params);

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
    var params = ['streamChannelKey', 'streamKey', 0, 'data'];

    mockRequest(url, action, apiKey, params);

    var client = new CmApiClient(url, apiKey);
    client.subscribe.apply(client, params).then(function(result) {
      assert.isTrue(result);
      done();
    });
  });

  it('isValidUser', function(done) {
    var url = 'http://localhost:8080';
    var action = 'isValidUser';
    var apiKey = 'test';
    var params = ['data'];

    mockRequest(url, action, apiKey, params);

    var client = new CmApiClient(url, apiKey);
    client.isValidUser.apply(client, params).then(function() {
      done();
    }).catch(function(error) {
      done(error);
    });
  });

});
