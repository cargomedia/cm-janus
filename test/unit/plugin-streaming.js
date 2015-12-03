var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var ProxyConnection = require('../../lib/proxy-connection');
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
    serviceLocator.register('cm-api-client', function() {
      var cmApiClient = new CmApiClient('http://localhost:8080', 'apiKey');
      sinon.stub(cmApiClient, '_request', function() {
        return Promise.resolve(true);
      });
      return cmApiClient;
    });
  });

  beforeEach(function() {
    serviceLocator.register('streams', new Streams());
  });

  after(function() {
    serviceLocator.reset();
  });

  it('message processing. onWebrtcup.', function() {
    var plugin = new PluginStreaming();
    var onWebrtcupStub = sinon.stub(plugin, 'onWebrtcup', function() {
      return Promise.resolve();
    });
    var webrtcupRequest = {
      janus: 'webrtcup',
      transaction: ProxyConnection.generateTransactionId()
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
      transaction: ProxyConnection.generateTransactionId()
    };
    plugin.processMessage(hangupRequest);

    assert(onHangupStub.calledOnce);
    assert(onHangupStub.calledWith(hangupRequest));

    var detachRequest = {
      janus: 'detach',
      transaction: ProxyConnection.generateTransactionId()
    };
    plugin.processMessage(detachRequest);

    assert(onHangupStub.calledTwice);
    assert(onHangupStub.calledWith(detachRequest));
  });

  it('create stream', function(done) {
    var proxyConnection = new ProxyConnection();
    proxyConnection.session = new Session(proxyConnection, 'session-id', 'session-data');
    var plugin = new PluginStreaming('id', 'type', proxyConnection);

    var createRequest = {
      janus: 'message',
      body: {request: 'create', id: 'streamId', channelData: 'channelData'},
      handle_id: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };
    var createResponse = {
      janus: 'event',
      plugindata: {data: {status: 'preparing'}},
      handle_id: plugin.id,
      transaction: createRequest.transaction
    };

    plugin.processMessage(createRequest).then(function() {
      proxyConnection.processMessage(createResponse).then(function() {
        assert.instanceOf(plugin.stream, Stream);
        assert.equal(plugin.stream.channelName, createRequest.body.id);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
        assert.equal(connectionStreams.length, 1);
        assert.equal(connectionStreams[0].channelName, createRequest.body.id);
        done();
      });
    });
  });

  it('create stream fail', function(done) {
    var proxyConnection = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    proxyConnection.session = new Session(proxyConnection, 'session-id', 'session-data');
    var plugin = new PluginStreaming('id', 'type', proxyConnection);

    var createRequest = {
      janus: 'message',
      body: {request: 'create', id: 'streamId'},
      handle_id: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };
    var createResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error'}},
      handle_id: plugin.id,
      transaction: createRequest.transaction
    };

    plugin.processMessage(createRequest).then(function() {
      proxyConnection.processMessage(createResponse).then(function() {
        assert.isNull(plugin.stream);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
        assert.equal(connectionStreams.length, 0);
        done();
      });
    });
  });

  it('webrtcup', function(done) {
    var proxyConnection = new ProxyConnection();
    proxyConnection.session = new Session(proxyConnection, 'session-id', 'session-data');
    var plugin = new PluginStreaming('id', 'type', proxyConnection);

    var webrtcupRequest = {
      janus: 'webrtcup',
      sender: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };

    plugin.stream = new Stream('id', 'channelName', plugin);
    plugin.processMessage(webrtcupRequest).then(function() {
      var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
      assert.equal(connectionStreams.length, 1);
      assert.equal(connectionStreams[0], plugin.stream);
      done();
    });
  });

});
