var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var ProxyConnection = require('../../lib/proxy-connection');
var Connection = require('../../lib/connection');
var PluginAudio = require('../../lib/plugin/audio');

var Logger = require('../../lib/logger');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');

describe('Audio plugin', function() {

  this.timeout(2000);

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', new Logger());
    serviceLocator.register('streams', new Streams());
  });

  after(function() {
    serviceLocator.reset();
  });

  it('message processing. onJoin.', function() {
    var plugin = new PluginAudio();
    var onJoinStub = sinon.stub(plugin, 'onJoin', function() {
      return Promise.resolve();
    });
    var joinRequest = {
      janus: 'message',
      body: {request: 'join'},
      transaction: ProxyConnection.generateTransactionId()
    };
    plugin.processMessage(joinRequest);

    assert(onJoinStub.calledOnce);
    assert(onJoinStub.calledWith(joinRequest));
  });

  it('join room', function(done) {
    var proxyConnection = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    var plugin = new PluginAudio('id', 'type', proxyConnection);
    proxyConnection.plugins[plugin.id] = plugin;

    var joinRequest = {
      janus: 'message',
      body: {request: 'join', id: 'streamId'},
      handle_id: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };
    var joinResponse = {
      janus: 'event',
      plugindata: {data: {audioroom: 'joined'}},
      sender: plugin.id,
      transaction: joinRequest.transaction
    };

    proxyConnection.processMessage(joinRequest).then(function() {
      proxyConnection.processMessage(joinResponse).then(function() {
        assert.equal(plugin.stream.channelName, joinRequest.body.id);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(proxyConnection);
        assert.equal(connectionStreams.length, 0);
        done();
      });
    });
  });

  it('join room fail', function(done) {
    var proxyConnection = new ProxyConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    var plugin = new PluginAudio('id', 'type', proxyConnection);
    proxyConnection.plugins[plugin.id] = plugin;

    var joinRequest = {
      janus: 'message',
      body: {request: 'watch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: ProxyConnection.generateTransactionId()
    };
    var joinResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error'}},
      sender: plugin.id,
      transaction: joinRequest.transaction
    };

    proxyConnection.processMessage(joinRequest).then(function() {
      proxyConnection.processMessage(joinResponse).then(function() {
        assert.isNull(plugin.stream);
        done();
      });
    });
  });

});
