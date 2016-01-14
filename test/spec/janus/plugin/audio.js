var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/global-error-handler');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var PluginAudio = require('../../../../lib/janus/plugin/audio');

var Logger = require('../../../../lib/logger');
var Stream = require('../../../../lib/stream');
var Streams = require('../../../../lib/streams');
var Channel = require('../../../../lib/channel');
var Channels = require('../../../../lib/channels');
var CmApiClient = require('../../../../lib/cm-api-client');
var serviceLocator = require('../../../../lib/service-locator');

describe('Audio plugin', function() {
  var plugin, session, connection, cmApiClient, streams, channels;

  this.timeout(2000);

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', new Logger());
    serviceLocator.register('streams', new Streams());
  });

  beforeEach(function() {
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginAudio('id', 'type', session);
    cmApiClient = sinon.createStubInstance(CmApiClient);
    serviceLocator.register('cm-api-client', cmApiClient);
    streams = sinon.createStubInstance(Streams);
    serviceLocator.register('streams', streams);
    channels = new Channels;
    sinon.spy(channels, 'add');
    sinon.stub(channels, 'getByNameAndData', function(name, data) {
      return Channel.generate(name, data);
    });
    serviceLocator.register('channels', channels);

    connection.session = session;
    session.plugins[plugin.id] = plugin;
  });

  after(function() {
    serviceLocator.reset();
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

  context('when processes "create" message', function() {
    var transaction;

    beforeEach(function() {
      sinon.spy(connection.transactions, 'add');
      plugin.processMessage({
        janus: 'message',
        body: {
          request: 'create',
          id: 'channel-name',
          channel_data: 'channel-data'
        },
        transaction: 'transaction-id'
      });
      transaction = connection.transactions.add.firstCall.args[1];
    });

    it('transaction should be added', function() {
      expect(connection.transactions.add.calledOnce).to.be.equal(true);
    });

    context('on unsuccessful transaction response', function() {
      it('should resolve', function(done) {
        transaction({}).then(function() {
          done();
        }, done);
      });
    });

    context('on successful transaction response', function() {
      var executeTransactionCallback;

      beforeEach(function() {
        executeTransactionCallback = function() {
          return transaction({
            janus: 'success',
            plugindata: {
              data: {
                id: 'plugin-id'
              }
            }
          });
        };
      });

      it('should add channel', function(done) {
        executeTransactionCallback().finally(function() {
          expect(channels.add.withArgs('channel-name', 'channel-data').calledOnce);
          done();
        });
      });
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
    cmApiClient.subscribe.restore();
    sinon.stub(cmApiClient, 'subscribe', function() {
      return Promise.resolve();
    });

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
        expect(cmApiClient.subscribe.calledOnce).to.be.equal(true);
        expect(cmApiClient.subscribe.firstCall.args[0]).to.be.equal(plugin.stream);
        expect(streams.add.withArgs(plugin.stream).calledOnce).to.be.equal(true);
        done();
      });
    });

  });

  it('change room fail', function(done) {
    cmApiClient.subscribe.restore();
    sinon.stub(cmApiClient, 'subscribe', function() {
      return Promise.resolve();
    });
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
        expect(cmApiClient.removeStream.calledWith(previousStream)).to.be.equal(true);
        expect(streams.remove.calledWith(previousStream)).to.be.equal(true);
        assert.equal(plugin.stream.channel.name, changeroomRequest.body.id);
        expect(cmApiClient.subscribe.called).to.be.equal(false);
        expect(streams.add.called).to.be.equal(false);
        done();
      });
    });
  });

});
