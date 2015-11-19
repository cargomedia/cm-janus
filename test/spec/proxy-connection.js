var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events');
var ProxyConnection = require('../../lib/proxy-connection');
var PluginStreaming = require('../../lib/plugin/streaming');


var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');
serviceLocator.register('logger', function() {
  return new Logger();
});
serviceLocator.register('streams', function() {
  return new EventEmitter;
});

describe('ProxyConnection', function() {

  it('message processing. onCreate.', function() {
    var proxy = new ProxyConnection();
    var onCreateStub = sinon.stub(proxy, 'onCreate', function() {
      return Promise.resolve();
    });
    var createRequest = {
      janus: 'create',
      token: 'token',
      transaction: proxy._generateTransactionId()
    };
    proxy.processMessage(createRequest);

    assert(onCreateStub.calledOnce);
    assert(onCreateStub.calledWith(createRequest));
  });

  it('message processing. onDestroy.', function() {
    var proxy = new ProxyConnection();
    var onDestroyStub = sinon.stub(proxy, 'onDestroy', function() {
      return Promise.resolve();
    });
    var destroyRequest = {
      janus: 'destroy',
      transaction: proxy._generateTransactionId()
    };
    proxy.processMessage(destroyRequest);

    assert(onDestroyStub.calledOnce);
    assert(onDestroyStub.calledWith(destroyRequest));
  });

  it('message processing. onAttach.', function() {
    var proxy = new ProxyConnection();

    var onAttachStub = sinon.stub(proxy, 'onAttach', function() {
      return Promise.resolve();
    });
    var attachRequest = {
      janus: 'attach',
      plugin: 'plugin',
      transaction: proxy._generateTransactionId()
    };
    proxy.processMessage(attachRequest);
    assert(onAttachStub.calledOnce);
    assert(onAttachStub.calledWith(attachRequest));
  });

  it('create/destroy session', function() {
    ////////////////// create ////////////////////////
    var proxy = new ProxyConnection();

    var createRequest = {
      janus: 'create',
      token: 'token',
      transaction: proxy._generateTransactionId()
    };
    var createResponse = {
      janus: 'success',
      data: {id: 'id'},
      transaction: createRequest.transaction
    };
    proxy.processMessage(createRequest);
    proxy.processMessage(createResponse);

    assert.equal(proxy.sessionId, createResponse.data.id);
    assert.equal(proxy.sessionData, createRequest.token);

    ////////////////// destroy ////////////////////////
    sinon.stub(proxy, 'close');
    var destroyRequest = {
      janus: 'destroy',
      transaction: proxy._generateTransactionId()
    };
    var destroyResponse = {
      transaction: destroyRequest.transaction
    };

    assert(!proxy.close.calledOnce);
    proxy.processMessage(destroyRequest);
    proxy.processMessage(destroyResponse);
    assert(proxy.close.calledOnce);
  });

  it('Attach plugin', function() {
    var proxy = new ProxyConnection();
    var pluginName = _.invert(ProxyConnection.pluginTypes)[PluginStreaming];
    var attachRequest = {
      janus: 'attach',
      plugin: pluginName,
      transaction: proxy._generateTransactionId()
    };
    var attachResponse = {
      janus: 'success',
      data: {id: 'id'},
      transaction: attachRequest.transaction
    };

    proxy.processMessage(attachRequest);
    proxy.processMessage(attachResponse);

    assert(proxy.getPlugin(attachResponse.data.id) instanceof PluginStreaming);
  });

  it('stop stream', function(done) {
    var pluginStub = {id: 'id', stream: {id: 'streamId'}};
    var janusConnection = {
      send: function(message) {
        assert.equal(message['janus'], 'message');
        assert.equal(message['body']['request'], 'stop');
        assert.equal(message['handle_id'], pluginStub.id);
        done();
      }
    };
    var proxy = new ProxyConnection(null, janusConnection);

    proxy.plugins[pluginStub.id] = pluginStub;
    proxy.stopStream('streamId');
  });
});
