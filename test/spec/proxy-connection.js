var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events');
require('../helpers/global-error-handler');
var JanusError = require('../../lib/janus-error');
var ProxyConnection = require('../../lib/proxy-connection');
var PluginStreaming = require('../../lib/plugin/streaming');
var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');

describe('ProxyConnection', function() {

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
    });
    serviceLocator.register('streams', function() {
      return new EventEmitter;
    });
  });

  after(function() {
    serviceLocator.reset();
  });

  it('message processing. onCreate.', function() {
    var proxy = new ProxyConnection();
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
    var proxy = new ProxyConnection();
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
    var proxy = new ProxyConnection();

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
    var proxy = new ProxyConnection();

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
    var proxy = new ProxyConnection();
    var pluginName = _.invert(ProxyConnection.pluginTypes)[PluginStreaming];
    var attachRequest = {
      janus: 'attach',
      plugin: pluginName,
      transaction: ProxyConnection.generateTransactionId()
    };
    var attachResponse = {
      janus: 'success',
      data: {id: 'id'},
      transaction: attachRequest.transaction
    };

    proxy.processMessage(attachRequest).then(function() {
      proxy.processMessage(attachResponse).then(function() {
        assert(proxy.getPlugin(attachResponse.data.id) instanceof PluginStreaming);
      });
    });
  });

  it('Attach illegal plugin', function() {
    var browserConnection = {send: sinon.stub()};
    var proxy = new ProxyConnection(browserConnection, null);
    var pluginName = 'unknown';
    var attachRequest = {
      janus: 'attach',
      plugin: pluginName,
      transaction: ProxyConnection.generateTransactionId()
    };

    proxy.processMessage(attachRequest).catch(function(error) {
      assert(browserConnection.send.calledOnce);
      var expected = new JanusError.IllegalPlugin(null).response.error.code;
      assert.equal(error.response.error.code, expected);
    });
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
