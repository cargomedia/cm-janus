var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var JanusConnection = require('../../lib/janus/connection');
var Session = require('../../lib/janus/session');
var Connection = require('../../lib/connection');
var PluginStreaming = require('../../lib/plugin/streaming');

var Logger = require('../../lib/logger');
var CmApiClient = require('../../lib/cm-api-client');
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');

describe('Streaming plugin', function() {

  this.timeout(2000);

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', new Logger());
  });

  beforeEach(function() {
    serviceLocator.register('streams', new Streams());
  });

  after(function() {
    serviceLocator.reset();
  });

  context('with successful cm-api-client', function() {
    before(function() {
      serviceLocator.register('cm-api-client', function() {
        var cmApiClient = new CmApiClient('http://localhost:8080', 'apiKey');
        sinon.stub(cmApiClient, '_request', function() {
          return Promise.resolve(true);
        });
        return cmApiClient;
      });
    });

    it('message processing. onWebrtcup.', function() {
      var plugin = new PluginStreaming();
      var onWebrtcupStub = sinon.stub(plugin, 'onWebrtcup', function() {
        return Promise.resolve();
      });
      var webrtcupRequest = {
        janus: 'webrtcup',
        transaction: JanusConnection.generateTransactionId()
      };
      plugin.processMessage(webrtcupRequest);

      assert(onWebrtcupStub.calledOnce);
      assert(onWebrtcupStub.calledWith(webrtcupRequest));
    });

    it('message processing. onHangup. onDetach', function() {
      var plugin = new PluginStreaming();
      var onHangupStub = sinon.stub(plugin, 'onHangup', function() {
        return Promise.resolve();
      });
      var hangupRequest = {
        janus: 'hangup',
        transaction: JanusConnection.generateTransactionId()
      };
      plugin.processMessage(hangupRequest);

      assert(onHangupStub.calledOnce);
      assert(onHangupStub.calledWith(hangupRequest));

      var detachRequest = {
        janus: 'detach',
        transaction: JanusConnection.generateTransactionId()
      };
      plugin.processMessage(detachRequest);

      assert(onHangupStub.calledTwice);
      assert(onHangupStub.calledWith(detachRequest));
    });

    it('create stream', function(done) {
      var janusConnection = new JanusConnection();
      janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
      var plugin = new PluginStreaming('id', 'type', janusConnection);

      var createRequest = {
        janus: 'message',
        body: {request: 'create', id: 'streamId', channelData: 'channelData'},
        handle_id: plugin.id,
        transaction: JanusConnection.generateTransactionId()
      };
      var createResponse = {
        janus: 'event',
        plugindata: {data: {status: 'preparing'}},
        handle_id: plugin.id,
        transaction: createRequest.transaction
      };

      plugin.processMessage(createRequest).then(function() {
        janusConnection.transactions.execute(createResponse.transaction, createResponse).then(function() {
          assert.equal(plugin.stream.channelName, createRequest.body.id);
          var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
          assert.equal(connectionStreams.length, 1);
          assert.equal(connectionStreams[0].channelName, createRequest.body.id);
          done();
        });
      });
    });

    it('create stream fail', function(done) {
      var janusConnection = new JanusConnection();
      janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
      var plugin = new PluginStreaming('id', 'type', janusConnection);

      var createRequest = {
        janus: 'message',
        body: {request: 'create', id: 'streamId'},
        handle_id: plugin.id,
        transaction: JanusConnection.generateTransactionId()
      };
      var createResponse = {
        janus: 'event',
        plugindata: {data: {error: 'error'}},
        handle_id: plugin.id,
        transaction: createRequest.transaction
      };

      plugin.processMessage(createRequest).then(function() {
        janusConnection.transactions.execute(createResponse.transaction, createResponse).then(function() {
          assert.isNull(plugin.stream);
          var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
          assert.equal(connectionStreams.length, 0);
          done();
        });
      });
    });

    it('webrtcup', function(done) {
      var janusConnection = new JanusConnection();
      janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
      var plugin = new PluginStreaming('id', 'type', janusConnection);

      var webrtcupRequest = {
        janus: 'webrtcup',
        sender: plugin.id,
        transaction: JanusConnection.generateTransactionId()
      };

      plugin.stream = new Stream('id', 'channelName', plugin);
      plugin.processMessage(webrtcupRequest).then(function() {
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
        assert.equal(connectionStreams.length, 1);
        assert.equal(connectionStreams[0], plugin.stream);
        done();
      });
    });
  });

  context('with error cm-api-client', function() {
    before(function() {
      serviceLocator.register('cm-api-client', null);
      serviceLocator.register('cm-api-client', function() {
        var cmApiClient = new CmApiClient('http://localhost:8080', 'apiKey');
        sinon.stub(cmApiClient, '_request', function() {
          return Promise.reject(new Error());
        });
        return cmApiClient;
      });
    });

    it('create stream. error publish', function(done) {
      var janusConnection = new JanusConnection();
      janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
      var plugin = new PluginStreaming('id', 'type', janusConnection);

      var createRequest = {
        janus: 'message',
        body: {request: 'create', id: 'streamId'},
        handle_id: plugin.id,
        transaction: JanusConnection.generateTransactionId()
      };
      var createResponse = {
        janus: 'event',
        plugindata: {data: {status: 'preparing'}},
        handle_id: plugin.id,
        transaction: createRequest.transaction
      };

      plugin.processMessage(createRequest).then(function() {
        janusConnection.transactions.execute(createResponse.transaction, createResponse)
          .then(function() {
            done(new Error('processMessage must fail on publish stream fail'));
          })
          .catch(function() {
            var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
            assert.equal(connectionStreams.length, 0);
            done();
          });
      });
    });

    it('webrtcup. error subscribe', function(done) {
      var janusConnection = new JanusConnection();
      janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
      var plugin = new PluginStreaming('id', 'type', janusConnection);

      var webrtcupRequest = {
        janus: 'webrtcup',
        sender: plugin.id,
        transaction: JanusConnection.generateTransactionId()
      };

      plugin.stream = new Stream('id', 'channelName', plugin);
      plugin.processMessage(webrtcupRequest)
        .then(function() {
          done(new Error('webrtcup must fail on subscribe stream fail'));
        })
        .catch(function() {
          var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
          assert.equal(connectionStreams.length, 0);
          done();
        });
    });
  });
});
