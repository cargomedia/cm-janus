var assert = require('chai').assert;
var nock = require('nock');
require('../helpers/global-error-handler');
var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');

var JanusHttpClient = require('../../lib/janus-http-client');

describe('JanusHttpClient spec tests', function() {

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

  context('stop stream', function() {
    var url = 'http://localhost:8080';
    var sessionId = 'sessionId';
    var pluginId = 'pluginId';
    var action = '/' + sessionId + '/' + pluginId;
    var mockRequest = function(url, action, response) {
      nock(url)
        .post(action, function(body) {
          assert.equal(body['janus'], 'message');
          assert.equal(body['body']['request'], 'stop');
          return true;
        })
        .reply(200, response);
    };

    it('success', function(done) {
      var response = {
        janus: 'ack',
        session_id: sessionId
      };
      mockRequest(url, action, response);

      var client = new JanusHttpClient(url);
      client.stopStream(sessionId, pluginId).then(function(result) {
        assert.deepEqual(result, response);
        done();
      });
    });

    it('xhr error', function(done) {
      var client = new JanusHttpClient('http://invalid.url');
      client.stopStream(sessionId, pluginId).catch(function(error) {
        assert.include(error.message, 'ENOTFOUND');
        done();
      });
    });

    it('general error', function(done) {
      var response = {
        janus: 'error',
        session_id: sessionId,
        error: {reason: 'Whatever'}
      };
      mockRequest(url, action, response);

      var client = new JanusHttpClient(url);
      client.stopStream(sessionId, pluginId).catch(function(error) {
        assert.include(error.message, response.error.reason);
        done();
      });
    });

    it('plugin error', function(done) {
      var response = {
        janus: 'message',
        session_id: sessionId,
        plugindata: {
          data: {
            error: 'Whatever'
          }
        }
      };
      mockRequest(url, action, response);

      var client = new JanusHttpClient(url);
      client.stopStream(sessionId, pluginId).catch(function(error) {
        assert.include(error.message, response.plugindata.data.error);
        done();
      });
    });

  });

});
