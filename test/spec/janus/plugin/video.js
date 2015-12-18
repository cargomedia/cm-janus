var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/global-error-handler');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var PluginVideo = require('../../../../lib/janus/plugin/video');
var CmApiClient = require('../../../../lib/cm-api-client');
var Logger = require('../../../../lib/logger');
var Streams = require('../../../../lib/streams');
var serviceLocator = require('../../../../lib/service-locator');

describe('Video plugin', function() {
  var plugin, session, connection, cmApiClient, streams;

  this.timeout(2000);

  before(function() {
    serviceLocator.register('logger', new Logger());
  });

  beforeEach(function() {
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginVideo('id', 'type', session);
    cmApiClient = sinon.createStubInstance(CmApiClient);
    serviceLocator.register('cm-api-client', cmApiClient);
    streams = sinon.createStubInstance(Streams);
    serviceLocator.register('streams', streams);

    connection.session = session;
    session.plugins[plugin.id] = plugin;
  });

  after(function() {
    serviceLocator.reset();
  });

  it('when processes "watch" message', function() {
    var onWatchStub = sinon.stub(plugin, 'onWatch', function() {
      return Promise.resolve();
    });
    var watchRequest = {
      janus: 'message',
      body: {request: 'watch'},
      transaction: 'transaction-id'
    };
    plugin.processMessage(watchRequest);

    assert(onWatchStub.calledOnce);
    assert(onWatchStub.calledWith(watchRequest));
  });

  it('watch stream', function(done) {
    var watchRequest = {
      janus: 'message',
      body: {request: 'watch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var watchResponse = {
      janus: 'event',
      plugindata: {data: {status: 'preparing'}},
      sender: plugin.id,
      transaction: watchRequest.transaction
    };

    plugin.processMessage(watchRequest).then(function() {
      connection.transactions.execute(watchRequest.transaction, watchResponse).then(function() {
        assert.equal(plugin.stream.channelName, watchRequest.body.id);
        done();
      });
    });
  });

  it('watch stream fail', function(done) {
    var watchRequest = {
      janus: 'message',
      body: {request: 'watch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var watchResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error'}},
      sender: plugin.id,
      transaction: watchRequest.transaction
    };

    plugin.processMessage(watchRequest).then(function() {
      connection.transactions.execute(watchRequest.transaction, watchResponse).then(function() {
        assert.isNull(plugin.stream);
        done();
      });
    });
  });

  it('when processes "switch" message', function() {
    var onSwitchStub = sinon.stub(plugin, 'onSwitch', function() {
      return Promise.resolve();
    });
    var switchRequest = {
      janus: 'message',
      body: {request: 'switch'},
      transaction: 'transaction-id'
    };
    plugin.processMessage(switchRequest);

    assert(onSwitchStub.calledOnce);
    assert(onSwitchStub.calledWith(switchRequest));
  });

  it('switch stream', function(done) {
    cmApiClient.subscribe.restore();
    sinon.stub(cmApiClient, 'subscribe', function() {
      return Promise.resolve();
    });

    var switchRequest = {
      janus: 'message',
      body: {request: 'switch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var switchResponse = {
      janus: 'event',
      plugindata: {data: {streaming: 'event', result: {}}},
      sender: plugin.id,
      transaction: switchRequest.transaction
    };

    plugin.processMessage(switchRequest).then(function() {
      connection.transactions.execute(switchRequest.transaction, switchResponse).then(function() {
        assert.equal(plugin.stream.channelName, switchRequest.body.id);
        expect(cmApiClient.subscribe.calledOnce).to.be.equal(true);
        var args = cmApiClient.subscribe.firstCall.args;
        expect(args[0]).to.be.equal(switchRequest.body.id);
        expect(args[1]).to.be.equal(plugin.stream.id);
        expect(args[2]).to.be.closeTo(Date.now() / 1000, 5);
        expect(args[3]).to.be.equal('session-data');
        expect(streams.add.withArgs(plugin.stream).calledOnce).to.be.equal(true);
        done();
      });
    });
  });

  it('switch stream fail', function(done) {
    cmApiClient.subscribe.restore();
    sinon.stub(cmApiClient, 'subscribe', function() {
      return Promise.resolve();
    });

    var switchRequest = {
      janus: 'message',
      body: {request: 'switch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var switchResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error', error_code: 455}},
      sender: plugin.id,
      transaction: switchRequest.transaction
    };

    plugin.processMessage(switchRequest).then(function() {
      connection.transactions.execute(switchRequest.transaction, switchResponse).then(function() {
        assert.equal(plugin.stream.channelName, switchRequest.body.id);
        expect(cmApiClient.subscribe.called).to.be.equal(false);
        expect(streams.add.called).to.be.equal(false);
        done();
      });
    });
  });

});
