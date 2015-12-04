var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var JanusConnection = require('../../lib/janus/connection');
var Session = require('../../lib/janus/session');
var Connection = require('../../lib/connection');
var PluginVideo = require('../../lib/janus/plugin/video');

var Logger = require('../../lib/logger');
var CmApiClient = require('../../lib/cm-api-client');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');

describe('Video plugin', function() {

  this.timeout(2000);

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', new Logger());
    serviceLocator.register('cm-api-client', function() {
      var cmApiClient = new CmApiClient('http://localhost:8080', 'apiKey');
      sinon.stub(cmApiClient, '_request', function() {
        return Promise.resolve(true);
      });
      return cmApiClient;
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
      transaction: JanusConnection.generateTransactionId()
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
      transaction: JanusConnection.generateTransactionId()
    };
    plugin.processMessage(watchRequest);

    assert(onWatchStub.calledOnce);
    assert(onWatchStub.calledWith(watchRequest));
  });

  it('watch stream', function(done) {
    var janusConnection = new JanusConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');
    var plugin = new PluginVideo('id', 'type', janusConnection);

    var watchRequest = {
      janus: 'message',
      body: {request: 'watch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: JanusConnection.generateTransactionId()
    };
    var watchResponse = {
      janus: 'event',
      plugindata: {data: {status: 'preparing'}},
      sender: plugin.id,
      transaction: watchRequest.transaction
    };

    plugin.processMessage(watchRequest).then(function() {
      janusConnection.transactions.execute(watchRequest.transaction, watchResponse).then(function() {
        assert.equal(plugin.stream.channelName, watchRequest.body.id);
        var connectionStreams = serviceLocator.get('streams').findAllByConnection(janusConnection);
        assert.equal(connectionStreams.length, 0);
        done();
      });
    });
  });

  it('watch stream fail', function(done) {
    var janusConnection = new JanusConnection(sinon.createStubInstance(Connection), sinon.createStubInstance(Connection));
    janusConnection.session = new Session(janusConnection, 'session-id', 'session-data');

    var plugin = new PluginVideo('id', 'type', janusConnection);

    var watchRequest = {
      janus: 'message',
      body: {request: 'watch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: JanusConnection.generateTransactionId()
    };
    var watchResponse = {
      janus: 'event',
      plugindata: {data: {error: 'error'}},
      sender: plugin.id,
      transaction: watchRequest.transaction
    };

    plugin.processMessage(watchRequest).then(function() {
      janusConnection.transactions.execute(watchRequest.transaction, watchResponse).then(function() {
        assert.isNull(plugin.stream);
        done();
      });
    });
  });

});
