var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/globals');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var PluginAudio = require('../../../../lib/janus/plugin/audio');

var Stream = require('../../../../lib/stream');
var Streams = require('../../../../lib/streams');
var Channel = require('../../../../lib/channel');
var serviceLocator = require('../../../../lib/service-locator');

describe('Audio plugin', function() {
  var plugin, session, connection, streams;

  this.timeout(2000);

  before(function() {
    serviceLocator.register('streams', new Streams());
  });

  after(function() {
    serviceLocator.unregister('streams');
  });

  beforeEach(function() {
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginAudio('id', 'type', session);
    streams = sinon.createStubInstance(Streams);
    streams.remove.returns(Promise.resolve());
    serviceLocator.register('streams', streams);

    connection.session = session;
    session.plugins[plugin.id] = plugin;
  });

  it('when processes invalid message', function(done) {
    var invalidRequestPromises = [];
    var invalidRequestActions = ['list', 'exists', 'resetdecoder', 'listparticipants'];

    invalidRequestActions.forEach(function(action) {
      var invalidRequest = {
        janus: 'message',
        body: {request: action},
        transaction: 'transaction-id'
      };
      invalidRequestPromises.push(plugin.processMessage(invalidRequest));
    });

    var destroyRequest = {
      janus: 'destroy',
      transaction: 'transaction-id'
    };
    invalidRequestPromises.push(plugin.processMessage(destroyRequest));


    Promise.all(invalidRequestPromises.map(function(promise) {
      return promise.reflect();
    })).then(function() {
      invalidRequestPromises.forEach(function(testPromise) {
        assert.isTrue(testPromise.isRejected());
      });
      done();
    });

  });

  it('when processes "join" message.', function() {
    var onJoinStub = sinon.stub(plugin, 'onJoin', function() {
      return Promise.resolve();
    });
    var joinRequest = {
      janus: 'message',
      body: {request: 'join'},
      transaction: 'transaction-id'
    };
    plugin.processMessage(joinRequest);

    assert(onJoinStub.calledOnce);
    assert(onJoinStub.calledWith(joinRequest));
  });

  it('when processes "changeroom" message.', function() {
    var onChangeroomStub = sinon.stub(plugin, 'onChangeroom', function() {
      return Promise.resolve();
    });
    var changeroomRequest = {
      janus: 'message',
      body: {request: 'changeroom'},
      transaction: 'transaction-id'
    };
    plugin.processMessage(changeroomRequest);

    assert(onChangeroomStub.calledOnce);
    assert(onChangeroomStub.calledWith(changeroomRequest));
  });

  it('when processes "destroyed" message.', function() {
    var onDestroyedStub = sinon.stub(plugin, 'onDestroyed', function() {
      return Promise.resolve();
    });
    var destroyedRequest = {
      janus: 'event',
      plugindata: {
        plugin: 'janus.plugin.cm.audioroom',
        data: {
          audioroom: 'destroyed'
        }
      }
    };
    plugin.processMessage(destroyedRequest);

    assert(onDestroyedStub.calledOnce);
    assert(onDestroyedStub.calledWith(destroyedRequest));
  });

  it('join room', function(done) {
    var joinRequest = {
      janus: 'message',
      body: {request: 'join', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var joinResponse = {
      janus: 'event',
      plugindata: {data: {audioroom: 'joined'}},
      sender: plugin.id,
      transaction: joinRequest.transaction
    };

    plugin.processMessage(joinRequest).then(function() {
      connection.transactions.execute(joinResponse.transaction, joinResponse).then(function() {
        assert.equal(plugin.stream.channel.name, joinRequest.body.id);
        done();
      });
    });
  });

  it('join room fail', function(done) {
    var joinRequest = {
      janus: 'message',
      body: {request: 'join', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var joinResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error'}},
      sender: plugin.id,
      transaction: joinRequest.transaction
    };

    plugin.processMessage(joinRequest).then(function() {
      connection.transactions.execute(joinResponse.transaction, joinResponse).then(function() {
        assert.isNull(plugin.stream);
        done();
      });
    });
  });

  it('change room', function(done) {
    streams.addSubscribe.returns(Promise.resolve());

    var changeroomRequest = {
      janus: 'message',
      body: {request: 'changeroom', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var changeroomResponse = {
      janus: 'event',
      plugindata: {data: {audioroom: 'roomchanged', result: {}}},
      sender: plugin.id,
      transaction: changeroomRequest.transaction
    };

    plugin.processMessage(changeroomRequest).then(function() {
      connection.transactions.execute(changeroomRequest.transaction, changeroomResponse).then(function() {
        assert.equal(plugin.stream.channel.name, changeroomRequest.body.id);
        expect(streams.addSubscribe.calledOnce).to.be.equal(true);
        expect(streams.addSubscribe.firstCall.args[0]).to.be.equal(plugin.stream);
        done();
      });
    });

  });

  it('change room fail', function(done) {
    streams.addSubscribe.returns(Promise.resolve());
    streams.has.returns(true);

    var changeroomRequest = {
      janus: 'message',
      body: {request: 'changeroom', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var changeroomResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error', error_code: 455}},
      sender: plugin.id,
      transaction: changeroomRequest.transaction
    };

    var previousChannel = new Channel('channel-id', 'channel-name', 'channel-data');
    var previousStream = new Stream('stream-id', previousChannel, plugin);
    plugin.stream = previousStream;
    plugin.processMessage(changeroomRequest).then(function() {
      connection.transactions.execute(changeroomRequest.transaction, changeroomResponse).then(function() {
        expect(streams.remove.calledWith(previousStream)).to.be.equal(true);
        expect(plugin.stream).to.be.equal(null);
        expect(streams.addSubscribe.called).to.be.equal(false);
        done();
      });
    });
  });

  it('destroy room', function(done) {
    streams.has.returns(true);
    var destroyedRequest = {
      janus: 'event',
      plugindata: {
        data: {
          audioroom: 'destroyed'
        }
      }
    };
    var channel = {};
    var stream = {channel: channel};
    plugin.stream = stream;
    plugin.channel = channel;
    plugin.processMessage(destroyedRequest).then(function() {
      expect(streams.remove.calledWith(stream)).to.be.equal(true);
      done();
    });
  });

});
