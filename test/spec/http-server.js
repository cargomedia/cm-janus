var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var sinon = require('sinon');
var requestPromise = require('request-promise');
var Promise = require('bluebird');

var HttpServer = require('../../lib/http-server');
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');
var JanusHttpClient = require('../../lib/janus/http-client');

var port = 8811;
var apiKey = 'foo-fish';

var request = function(method, path, headers, data) {
  var options = {
    method: method,
    uri: 'http://localhost:' + port + '/' + path,
    body: data || {},
    headers: headers || {},
    json: true
  };
  return requestPromise(options);
};

var authenticatedRequest = function(method, path, data) {
  var headers = {'Server-Key': apiKey};
  return request(method, path, headers, data);
};

describe('HttpServer', function() {
  var httpServer;

  before(function() {
    httpServer = new HttpServer(port, apiKey);
  });

  it('should store port and api-key', function() {
    expect(httpServer.port).to.be.equal(port);
    expect(httpServer.apiKey).to.be.equal(apiKey);
  });

  context('when running', function() {

    before(function(done) {
      httpServer.start().then(done);
    });

    it('should reject unauthorized requests', function(done) {
      expect(request('GET', 'anything')).to.eventually.be.rejectedWith(Error, '403').and.eventually.notify(done);
    });

    it('should respond with 404 on invalid request', function(done) {
      expect(authenticatedRequest('GET', 'invalid')).to.eventually.be.rejectedWith(Error, '404').and.eventually.notify(done);
    });

    context('when receives stopStream request', function() {
      var streams;

      before(function() {
        streams = new Streams();
        serviceLocator.register('streams', streams);
      });

      after(function() {
        serviceLocator.unregister('streams');
      });

      it('should return error on invalid stream id', function(done) {
        var response = authenticatedRequest('POST', 'stopStream', {streamId: 'invalid-stream-id'});
        expect(response).to.eventually.have.property('error', 'Unknown stream: invalid-stream-id').and.eventually.notify(done)
      });

      context('on valid stream', function() {
        var janusHttpClient;

        before(function() {
          janusHttpClient = new JanusHttpClient();
          serviceLocator.register('http-client', janusHttpClient);
          var plugin = 'plugin';
          var channel = {name: 'channel-name', data: 'channel-data'};
          var stream = new Stream('stream-id', channel, plugin);
          streams.add(stream);
        });

        after(function() {
          serviceLocator.unregister('http-client');
        });

        it('should return error on failure close', function(done) {
          sinon.stub(janusHttpClient, 'detach', function() {
            return Promise.reject(new Error('Cannot close'));
          });
          authenticatedRequest('POST', 'stopStream', {streamId: 'stream-id'}).then(function(response) {
            assert(janusHttpClient.detach.withArgs('plugin').calledOnce);
            expect(response).to.have.property('error', 'Stream stop failed');
            done();
          }, done);
        });

        it('should return success on successful close', function(done) {
          sinon.stub(janusHttpClient, 'detach', function() {
            return Promise.resolve();
          });
          authenticatedRequest('POST', 'stopStream', {streamId: 'stream-id'}).then(function(response) {
            assert(janusHttpClient.detach.withArgs('plugin').calledOnce);
            expect(response).to.have.property('success', 'Stream stopped');
            done();
          }, done);
        });

        afterEach(function() {
          janusHttpClient.detach.restore();
        })
      });
    });

    context('when receives status request', function() {
      before(function() {
        var streams = new Streams();
        var channel = {name: 'channel-name', data: 'channel-data'};
        var stream = new Stream('stream-id', channel);
        streams.add(stream);
        serviceLocator.register('streams', streams);
      });

      after(function() {
        serviceLocator.unregister('streams');
      });

      it('should return status', function(done) {
        var expectedStatus = [
          {id: 'stream-id', channelName: 'channel-name'}
        ];
        expect(authenticatedRequest('GET', 'status')).to.eventually.deep.equal(expectedStatus).and.eventually.notify(done);
      });
    });
  });
});
