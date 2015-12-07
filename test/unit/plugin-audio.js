var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var JanusConnection = require('../../lib/janus/connection');
var Session = require('../../lib/janus/session');
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
      transaction: JanusConnection.generateTransactionId()
    };
    plugin.processMessage(joinRequest);

    assert(onJoinStub.calledOnce);
    assert(onJoinStub.calledWith(joinRequest));
  });

  it('join room', function(done) {
    var janusConnection = new JanusConnection();
    janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
    var plugin = new PluginAudio('id', 'type', janusConnection);

    var joinRequest = {
      janus: 'message',
      body: {request: 'join', id: 'streamId'},
      handle_id: plugin.id,
      transaction: JanusConnection.generateTransactionId()
    };
    var joinResponse = {
      janus: 'event',
      plugindata: {data: {audioroom: 'joined'}},
      sender: plugin.id,
      transaction: joinRequest.transaction
    };

    plugin.processMessage(joinRequest).then(function() {
      janusConnection.transactions.execute(joinResponse.transaction, joinResponse).then(function() {
        assert.equal(plugin.stream.channelName, joinRequest.body.id);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
        assert.equal(connectionStreams.length, 0);
        done();
      });
    });
  });

  it('join room fail', function(done) {
    var janusConnection = new JanusConnection();
    janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
    var plugin = new PluginAudio('id', 'type', janusConnection);

    var joinRequest = {
      janus: 'message',
      body: {request: 'join', id: 'streamId'},
      handle_id: plugin.id,
      transaction: JanusConnection.generateTransactionId()
    };
    var joinResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error'}},
      sender: plugin.id,
      transaction: joinRequest.transaction
    };

    plugin.processMessage(joinRequest).then(function() {
      janusConnection.transactions.execute(joinResponse.transaction, joinResponse).then(function() {
        assert.isNull(plugin.stream);
        done();
      });
    });
  });

});
