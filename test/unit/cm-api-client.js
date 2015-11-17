var expect = require('chai').expect;
var nock = require('nock');

var App = require('../../lib/index');
new App({}).registerServices();

var CmApiClient = require('../../lib/cm-api-client');

describe('CmApiClient Unit tests', function() {

  this.timeout(2000);

  function mockRequest(url, action, apiKey, params) {
    nock(url)
      .post('/', function(body) {
        expect(body['method']).to.equal('CM_Janus_RpcEndpoints.' + action);
        expect(body['params']).to.eql([apiKey].concat(params));
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
    var params = ['streamChannelKey', 'streamKey', 0, 'data'];

    mockRequest(url, action, apiKey, params);

    var client = new CmApiClient(url, apiKey);
    client.publish.apply(client, params).then(function(result) {
      expect(result).to.equal(true);
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
      expect(result).to.equal(true);
      done();
    });
  });

  it.only('isValidUser', function(done) {
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
