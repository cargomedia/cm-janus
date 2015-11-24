var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
var nock = require('nock');
require('../helpers/global-error-handler');
var ProxyConnection = require('../../lib/proxy-connection');
var PluginVideo = require('../../lib/plugin/video');

var Logger = require('../../lib/logger');
var CmApiClient = require('../../lib/cm-api-client');
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');

describe('Video plugin', function() {

  this.timeout(2000);

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', new Logger());
    serviceLocator.register('cm-api-client', function() {
      var baseUrl = 'http://localhost:8080';
      var apiKey = 'apiKey';
      var mockRequest = function() {
        nock(baseUrl)
          .post('/')
          .reply(200, function() {
            mockRequest();
            return {success: {result: true}};
          });
      };
      mockRequest();

      return new CmApiClient(baseUrl, apiKey);
    });
  });

  beforeEach(function() {
    serviceLocator.register('streams', new Streams());
  });

  after(function() {
    serviceLocator.reset();
  });

  it('message processing. onCreate.', function() {
    var plugin = new PluginVideo();
    var onCreateStub = sinon.stub(plugin, 'onCreate', function() {
      return Promise.resolve();
    });
    var createRequest = {
      janus: 'message',
      body: {request: 'create'},
      transaction: ProxyConnection.generateTransactionId()
    };
    plugin.processMessage(createRequest);

    assert(onCreateStub.calledOnce);
    assert(onCreateStub.calledWith(createRequest));
  });

  it('message processing. onWatch.', function() {
    var plugin = new PluginVideo();
    var onWatchStub = sinon.stub(plugin, 'onWatch', function() {
      return Promise.resolve();
    });
    var watchRequest = {
      janus: 'message',
      body: {request: 'watch'},
      transaction: ProxyConnection.generateTransactionId()
    };
    plugin.processMessage(watchRequest);

    assert(onWatchStub.calledOnce);
    assert(onWatchStub.calledWith(watchRequest));
  });

  it('message processing. onWebrtcup.', function() {
    var plugin = new PluginVideo();
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
    var plugin = new PluginVideo();
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
    ////////////////// create ////////////////////////
    var proxyConnection = new ProxyConnection();
    var plugin = new PluginVideo('id', 'type', proxyConnection);
    proxyConnection.plugins[plugin.id] = plugin;

    var createRequest = {
      janus: 'message',
      body: {request: 'create', id: 'streamId'},
      handle_id: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };
    var createResponse = {
      janus: 'success',
      data: {id: 'id'},
      handle_id: plugin.id,
      transaction: createRequest.transaction
    };

    proxyConnection.processMessage(createRequest).then(function() {
      proxyConnection.processMessage(createResponse).then(function() {
        assert.equal(plugin.stream.channelName, createRequest.body.id);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
        assert.equal(connectionStreams.length, 1);
        assert.equal(connectionStreams[0].channelName, createRequest.body.id);
        done();
      });
    });
  });

  it('watch stream', function(done) {
    ////////////////// create ////////////////////////
    var proxyConnection = new ProxyConnection();
    var plugin = new PluginVideo('id', 'type', proxyConnection);
    proxyConnection.plugins[plugin.id] = plugin;

    var watchRequest = {
      janus: 'message',
      body: {request: 'watch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };
    var watchResponse = {
      janus: 'event',
      sender: plugin.id,
      transaction: watchRequest.transaction
    };

    proxyConnection.processMessage(watchRequest).then(function() {
      proxyConnection.processMessage(watchResponse).then(function() {
        assert.equal(plugin.stream.channelName, watchRequest.body.id);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
        assert.equal(connectionStreams.length, 0);
        done();
      });
    });
  });

  it('webrtcup', function(done) {
    ////////////////// create ////////////////////////
    var proxyConnection = new ProxyConnection();
    var plugin = new PluginVideo('id', 'type', proxyConnection);
    proxyConnection.plugins[plugin.id] = plugin;

    var webrtcupRequest = {
      janus: 'webrtcup',
      sender: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };

    plugin.stream = new Stream('id', 'channelName', proxyConnection);
    proxyConnection.processMessage(webrtcupRequest).then(function() {
      var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
      assert.equal(connectionStreams.length, 1);
      assert.equal(connectionStreams[0], plugin.stream);
      done();
    });
  });

});
