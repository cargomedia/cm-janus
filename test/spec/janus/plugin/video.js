var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/global-error-handler');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var PluginVideo = require('../../../../lib/janus/plugin/video');
var JanusError = require('../../../../lib/janus/error');
var Stream = require('../../../../lib/stream');
var Streams = require('../../../../lib/streams');
var Channel = require('../../../../lib/channel');
var CmApiClient = require('../../../../lib/cm-api-client');
var Logger = require('../../../../lib/logger');
var JanusHttpClient = require('../../../../lib/janus/http-client');
var serviceLocator = require('../../../../lib/service-locator');

describe('Video plugin', function() {
  var plugin, session, connection, cmApiClient, httpClient, streams;

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
    httpClient = sinon.createStubInstance(JanusHttpClient);
    serviceLocator.register('http-client', httpClient);
    streams = sinon.createStubInstance(Streams);
    serviceLocator.register('streams', streams);

    connection.session = session;
    session.plugins[plugin.id] = plugin;
  });

  after(function() {
    serviceLocator.reset();
  });

  it('when processes invalid message', function(done) {
    var invalidRequestPromises = [];

    var listRequest = {
      janus: 'message',
      body: {request: 'list'},
      transaction: 'transaction-id'
    };
    invalidRequestPromises.push(plugin.processMessage(listRequest));

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
        cmApiClient.publish.restore();
        sinon.stub(cmApiClient, 'publish', function() {
          return Promise.resolve();
        });
      });

      it('should set stream', function(done) {
        executeTransactionCallback().finally(function() {
          expect(plugin.stream).to.be.instanceOf(Stream);
          expect(plugin.stream.plugin).to.be.equal(plugin);
          done();
        });
      });

      it('should publish', function(done) {
        executeTransactionCallback().finally(function() {
          expect(cmApiClient.publish.calledOnce).to.be.equal(true);
          expect(cmApiClient.publish.firstCall.args[0]).to.be.equal(plugin.stream);
          done();
        });
      });

      context('on successful publish', function() {
        it('should add stream to streams', function(done) {
          executeTransactionCallback().finally(function() {
            done();
          });
        });
      });

      context('on unsuccessful publish', function() {
        beforeEach(function() {
          cmApiClient.publish.restore();
          sinon.stub(cmApiClient, 'publish', function() {
            return Promise.reject(new JanusError.Error('Cannot publish'));
          });
        });

        it('should detach and should reject', function(done) {
          executeTransactionCallback().then(function() {
            done(new Error('Should not resolve'));
          }, function(error) {
            expect(httpClient.detach.callCount).to.be.equal(1);
            expect(error.message).to.include('error: Cannot publish');
            done();
          });
        });
      })
    });
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
      body: {request: 'watch', id: 'channel-name'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var watchResponse = {
      janus: 'event',
      plugindata: {
        data: {
          status: 'preparing',
          stream: {
            id: 'channel-name',
            uid: 'channel-uid'
          }
        }
      },
      sender: plugin.id,
      transaction: watchRequest.transaction
    };

    plugin.processMessage(watchRequest).then(function() {
      connection.transactions.execute(watchRequest.transaction, watchResponse).then(function() {
        assert.equal(plugin.stream.channel.name, 'channel-name');
        assert.equal(plugin.stream.channel.id, 'channel-uid');
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
      body: {request: 'switch', id: 'channel-name'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var switchResponse = {
      janus: 'event',
      plugindata: {
        data: {
          streaming: 'event',
          result: {},
          current: {
            id: 'previous-channel-name',
            uid: 'previous-channel-uid'
          },
          next: {
            id: 'channel-name',
            uid: 'channel-uid'
          }
        }
      },
      sender: plugin.id,
      transaction: switchRequest.transaction
    };

    plugin.processMessage(switchRequest).then(function() {
      connection.transactions.execute(switchRequest.transaction, switchResponse).then(function() {
        assert.equal(plugin.stream.channel.name, 'channel-name');
        assert.equal(plugin.stream.channel.id, 'channel-uid');
        expect(cmApiClient.subscribe.calledOnce).to.be.equal(true);
        expect(cmApiClient.subscribe.firstCall.args[0]).to.be.equal(plugin.stream);
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
    streams.has.returns(true);

    var switchRequest = {
      janus: 'message',
      body: {request: 'switch', id: 'streamId'},
      handle_id: plugin.id,
      transaction: 'transaction-id'
    };
    var switchResponse = {
      janus: 'event',
      plugindata: {
        data: {
          error: 'error', error_code: 455
        }
      },
      sender: plugin.id,
      transaction: switchRequest.transaction
    };

    var previousChannel = new Channel('channel-id', 'channel-name', 'channel-data');
    var previousStream = new Stream('stream-id', previousChannel, plugin);
    plugin.stream = previousStream;
    plugin.processMessage(switchRequest).then(function() {
      connection.transactions.execute(switchRequest.transaction, switchResponse).then(function() {
        expect(cmApiClient.removeStream.calledWith(previousStream)).to.be.equal(true);
        expect(streams.remove.calledWith(previousStream)).to.be.equal(true);
        expect(plugin.stream).to.be.equal(null);
        expect(cmApiClient.subscribe.called).to.be.equal(false);
        expect(streams.add.called).to.be.equal(false);
        done();
      });
    });
  });

  it('when processes "stopped" message.', function() {
    var onStoppedStub = sinon.stub(plugin, 'onStopped', function() {
      return Promise.resolve();
    });
    var stoppedRequest = {
      janus: 'event',
      plugindata: {
        data: {
          streaming: 'event',
          result: {
            status: 'stopped'
          }
        }
      }
    };
    plugin.processMessage(stoppedRequest);

    assert(onStoppedStub.calledOnce);
    assert(onStoppedStub.calledWith(stoppedRequest));
  });

  it('stop mountpoint', function(done) {
    streams.has.returns(true);
    var stoppedRequest = {
      janus: 'event',
      plugindata: {
        data: {
          streaming: 'event',
          result: {
            status: 'stopped'
          }
        }
      }
    };
    var channel = {};
    var stream = {channel: channel};
    plugin.stream = stream;
    plugin.channel = channel;
    plugin.processMessage(stoppedRequest).then(function() {
      expect(streams.remove.calledWith(stream)).to.be.equal(true);
      done();
    });
  });

});
