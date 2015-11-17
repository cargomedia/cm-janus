var assert = require('chai').assert;
var CMApiClient = require('../../lib/cm-api-client');
var Promise = require('bluebird');
var sinon = require('sinon');

describe('cm-api-client', function() {

  it('created properly', function() {
    var baseUrl = 'http://cm.dev/';
    var apiKey = 'foo';
    var cmHttpClient = new CMApiClient(baseUrl, apiKey);

    assert.instanceOf(cmHttpClient, CMApiClient, 'has proper type');
    assert.equal(cmHttpClient.baseUrl, baseUrl, 'has proper baseUrl');
    assert.equal(cmHttpClient.apiKey, apiKey, 'has proper apiKey');
  });

  it('call isValidUser', function() {
    var cmHttpClient = new CMApiClient('http://cm.dev/', 'foo');
    var userData = {foo: 'bar'};
    var successStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(true));

    cmHttpClient.isValidUser(userData);

    assert.isTrue(successStub.calledOnce);
    assert.isTrue(successStub.alwaysCalledWithExactly('isValidUser', [userData]));

    successStub.restore();
    var failStub = sinon.stub(cmHttpClient, '_request').returns(Promise.resolve(false));
    cmHttpClient.isValidUser(userData).catch(function(err) {
      failStub.threw(err);
    });

    assert.isTrue(failStub.calledOnce);
  });

});
