var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/global-error-handler');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var PluginVideo = require('../../../../lib/janus/plugin/video');

var Logger = require('../../../../lib/logger');
var serviceLocator = require('../../../../lib/service-locator');

describe('Video plugin', function() {
  var plugin, session, connection;

  this.timeout(2000);

  before(function() {
    serviceLocator.register('logger', new Logger());
  });

  beforeEach(function() {
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginVideo('id', 'type', session);

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

});
