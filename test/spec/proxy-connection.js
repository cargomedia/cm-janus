var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var WebSocketServer = require('../helpers/websocket').Server;
var WebSocket = require('../helpers/websocket').Client;
var JanusError = require('../../lib/janus-error');
var ProxyConnection = require('../../lib/proxy-connection');
var Connection = require('../../lib/connection');
var PluginVideo = require('../../lib/plugin/video');
var Logger = require('../../lib/logger');
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var CmApiClient = require('../../lib/cm-api-client');
var serviceLocator = require('../../lib/service-locator');

describe('ProxyConnection', function() {

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
    });
    serviceLocator.register('cm-api-client', function() {
      var cmApiClient = new CmApiClient('http://localhost:8080', 'apiKey');
      sinon.stub(cmApiClient, '_request', function() {
        return Promise.resolve(true);
      });
      return cmApiClient;
    });
  });

  beforeEach(function() {
    serviceLocator.register('streams', function() {
      return new Streams();
    });
  });

  after(function() {
    serviceLocator.reset();
  });

  it('message processing. onCreate.', function() {
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    var onCreateStub = sinon.stub(proxy, 'onCreate', function() {
      return Promise.resolve();
    });
    var createRequest = {
      janus: 'create',
      token: 'token',
      transaction: ProxyConnection.generateTransactionId()
    };
    proxy.processMessage(createRequest).then(function() {
      assert(onCreateStub.calledOnce);
      assert(onCreateStub.calledWith(createRequest));
    });
  });

  it('message processing. onDestroy.', function() {
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    var onDestroyStub = sinon.stub(proxy, 'onDestroy', function() {
      return Promise.resolve();
    });
    var destroyRequest = {
      janus: 'destroy',
      transaction: ProxyConnection.generateTransactionId()
    };
    proxy.processMessage(destroyRequest).then(function() {
      assert(onDestroyStub.calledOnce);
      assert(onDestroyStub.calledWith(destroyRequest));
    });
  });

  it('message processing. onAttach.', function() {
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));

    var onAttachStub = sinon.stub(proxy, 'onAttach', function() {
      return Promise.resolve();
    });
    var attachRequest = {
      janus: 'attach',
      plugin: 'plugin',
      transaction: ProxyConnection.generateTransactionId()
    };
    proxy.processMessage(attachRequest).then(function() {
      assert(onAttachStub.calledOnce);
      assert(onAttachStub.calledWith(attachRequest));
    });
  });

  it('create/destroy session', function(done) {
    ////////////////// create ////////////////////////
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));

    var createRequest = {
      janus: 'create',
      token: 'token',
      transaction: ProxyConnection.generateTransactionId()
    };
    var createResponse = {
      janus: 'success',
      data: {id: 'id'},
      transaction: createRequest.transaction
    };
    proxy.processMessage(createRequest).then(function() {
      proxy.processMessage(createResponse).then(function() {
        assert.equal(proxy.sessionId, createResponse.data.id);
        assert.equal(proxy.sessionData, createRequest.token);

        ////////////////// destroy ////////////////////////
        sinon.stub(proxy, 'close');
        var destroyRequest = {
          janus: 'destroy',
          transaction: ProxyConnection.generateTransactionId()
        };
        var destroyResponse = {
          transaction: destroyRequest.transaction
        };

        assert(!proxy.close.called);
        proxy.processMessage(destroyRequest).then(function() {
          proxy.processMessage(destroyResponse).then(function() {
            assert(proxy.close.calledOnce);
            done();
          });
        });
      })
    });
  });

  it('Attach plugin', function() {
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    var attachRequest = {
      janus: 'attach',
      plugin: PluginVideo.TYPE,
      transaction: ProxyConnection.generateTransactionId()
    };
    var attachResponse = {
      janus: 'success',
      data: {id: 'id'},
      transaction: attachRequest.transaction
    };

    proxy.processMessage(attachRequest).then(function() {
      proxy.processMessage(attachResponse).then(function() {
        assert(proxy.getPlugin(attachResponse.data.id) instanceof PluginVideo);
      });
    });
  });

  it('Attach illegal plugin', function(done) {
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    var pluginName = 'unknown';
    var attachRequest = {
      janus: 'attach',
      plugin: pluginName,
      transaction: ProxyConnection.generateTransactionId()
    };

    proxy.processMessage(attachRequest).catch(function(error) {
      assert(proxy.browserConnection.send.calledOnce);
      var expected = new JanusError.IllegalPlugin(null).response.error.code;
      assert.equal(error.response.error.code, expected);
      done();
    });
  });

  it('stop stream', function(done) {
    var pluginStub = {id: 'id', stream: {id: 'streamId'}};
    var janusConnection = sinon.createStubInstance(Connection);
    janusConnection.send = function(message) {
      assert.equal(message['janus'], 'message');
      assert.equal(message['body']['request'], 'stop');
      assert.equal(message['handle_id'], pluginStub.id);
      done();
    };
    var proxy = new ProxyConnection(sinon.createStubInstance(Connection), janusConnection);

    proxy.plugins[pluginStub.id] = pluginStub;
    proxy.stopStream('streamId');
  });

  it('close connection', function(done) {
    new WebSocketServer('ws://localhost:8081');
    new WebSocketServer('ws://localhost:8082');
    var browserSocket = new WebSocket('ws://localhost:8081');
    var browserConnection = new Connection('browser', browserSocket);
    var janusSocket = new WebSocket('ws://localhost:8082');
    var janusConnection = new Connection('janus', janusSocket);

    Promise.join(
      new Promise(function(resolve) {
        browserSocket.once('open', resolve)
      }), new Promise(function(resolve) {
        janusSocket.once('open', resolve)
      }))
      .then(function() {
        assert.isTrue(browserConnection.isOpened());
        assert.isTrue(janusConnection.isOpened());
        var proxy = new ProxyConnection(browserConnection, janusConnection);
        var stream = new Stream('id', null, {proxyConnection: proxy});
        var streams = serviceLocator.get('streams');
        streams.add(stream);
        assert.equal(streams.findAllByConnection(proxy).length, 1);
        proxy.close();
        assert.isFalse(browserConnection.isOpened());
        assert.isFalse(janusConnection.isOpened());
        assert.equal(streams.findAllByConnection(proxy).length, 0);
        done();
      });
  });
});
