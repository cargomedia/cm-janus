var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/globals');
var Stream = require('../../../../lib/stream');
var PluginStreaming = require('../../../../lib/janus/plugin/streaming');
var JanusError = require('../../../../lib/janus/error');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var Streams = require('../../../../lib/streams');
var JanusHttpClient = require('../../../../lib/janus/http-client');
var serviceLocator = require('../../../../lib/service-locator');

describe('PluginStreaming', function() {
  var plugin, session, connection, streams, httpClient;

  beforeEach(function() {
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginStreaming('plugin-id', 'plugin-type', session);
    session.plugins[plugin.id] = plugin;

    streams = sinon.createStubInstance(Streams);
    serviceLocator.register('streams', streams);
    httpClient = sinon.createStubInstance(JanusHttpClient);
    serviceLocator.register('http-client', httpClient);
  });

  context('when processes "webrtcup" message', function() {
    var processWebrtcupMessage;

    beforeEach(function() {
      var channel = {name: 'channel-name', data: 'channel-data'};
      var stream = new Stream('stream-id', channel);
      plugin.stream = new Stream('stream-id', 'channel-name', 'channel-data', plugin);
      processWebrtcupMessage = function() {
        return plugin.processMessage({
          janus: 'webrtcup'
        });
      };
      streams.addSubscribe.returns(Promise.resolve());
    });

    it('should subscribe', function(done) {
      processWebrtcupMessage().finally(function() {
        expect(streams.addSubscribe.calledOnce).to.be.equal(true);
        expect(streams.addSubscribe.firstCall.args[0]).to.be.equal(plugin.stream);
        done();
      });
    });

    context('on successful subscribe', function() {
      it('should add stream to streams', function(done) {
        processWebrtcupMessage().finally(function() {
          done();
        });
      });
    });

    context('on unsuccessful subscribe', function() {
      beforeEach(function() {
        streams.addSubscribe.restore();
        httpClient.detach.returns(Promise.resolve());
        sinon.stub(streams, 'addSubscribe', function() {
          return Promise.reject(new JanusError.Error('Cannot subscribe'));
        });
      });

      it('should detach and should reject', function(done) {
        processWebrtcupMessage().then(function() {
          done(new Error('Should not resolve'));
        }, function(error) {
          expect(httpClient.detach.callCount).to.be.equal(1);
          expect(error.stack).to.include('error: Cannot subscribe');
          done();
        });
      });
    })
  });

  context('when processes "hangup" message', function() {
    beforeEach(function() {
      var message = {
        janus: 'hangup',
        sender: 'plugin-id',
        token: 'token'
      };
      sinon.stub(plugin, 'removeStream', Promise.resolve);
      plugin.processMessage(message);
    });

    it('should remove stream', function() {
      expect(plugin.removeStream.calledOnce).to.be.equal(true);
    });
  });


  context('when removed', function() {
    it('should remove stream', function() {
      sinon.stub(plugin, 'removeStream', function() {
        return Promise.resolve();
      });
      plugin.onRemove();
      expect(plugin.removeStream.calledOnce).to.be.equal(true);
    });
  });

  context('with existing stream', function() {
    var stream;

    beforeEach(function() {
      stream = new Stream('stream-id', 'channel', plugin);
      plugin.stream = stream;
      streams.remove.returns(Promise.resolve());
    });
    context('when removes stream', function() {
      beforeEach(function(done) {
        plugin.removeStream().finally(done);
      });

      it('should remove stream reference', function() {
        expect(plugin.stream).to.be.equal(null);
      });

      it('should remove stream from streams', function() {
        expect(streams.remove.calledOnce).to.be.equal(true);
        expect(streams.remove.firstCall.args[0]).to.be.equal(stream);
      });
    });
  })
});
