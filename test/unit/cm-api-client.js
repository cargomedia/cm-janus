var assert = require('chai').assert;
var CMApiClient = require('../../lib/cm-api-client');
var Promise = require('bluebird');

describe('cm-api-client', function() {

  it('created properly', function() {
    var baseUrl = 'http://cm.dev/';
    var apiKey = 'foo';
    var cmHttpClient = new CMApiClient(baseUrl, apiKey);

    assert.instanceOf(cmHttpClient, CMApiClient, 'has proper type');
    assert.equal(cmHttpClient.baseUrl, baseUrl, 'has proper baseUrl');
    assert.equal(cmHttpClient.apiKey, apiKey, 'has proper apiKey');
  });
});
