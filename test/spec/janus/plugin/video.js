var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../../helpers/globals');
var serviceLocator = require('../../../../lib/service-locator');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var PluginVideo = require('../../../../lib/janus/plugin/video');
var JanusError = require('../../../../lib/janus/error');
var Stream = require('../../../../lib/stream');
var Streams = require('../../../../lib/streams');
var Channel = require('../../../../lib/channel');

describe('Video plugin', function() {
  var plugin, session, connection;

  this.timeout(2000);

  beforeEach(function() {
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginVideo('id', 'type', session);
    sinon.stub(plugin, 'publish');
    sinon.stub(plugin, 'subscribe');
    sinon.stub(plugin, 'removeStream');

    connection.session = session;
    session.plugins[plugin.id] = plugin;
  });

  it('when processes invalid message', function(done) {
    var invalidRequestPromises = [];

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
                stream: {
                  id: 'channel-name',
                  uid: 'channel-uid'
                }
              }
            }
          });
        };
        plugin.publish.returns(Promise.resolve());
      });

      it('should set stream with channel', function(done) {
        executeTransactionCallback().finally(function() {
          expect(plugin.stream).to.be.instanceOf(Stream);
          expect(plugin.stream.plugin).to.be.equal(plugin);
          expect(plugin.stream.channel.name).to.be.equal('channel-name');
          expect(plugin.stream.channel.id).to.be.equal('channel-uid');
          done();
        });
      });

      it('should publish', function(done) {
        executeTransactionCallback().finally(function() {
          expect(plugin.publish.calledOnce).to.be.equal(true);
          done();
        });
      });

      context('on unsuccessful publish', function() {
        beforeEach(function() {
          plugin.publish.returns(Promise.reject(new JanusError.Error('Cannot publish')));
        });

        it('should reject', function(done) {
          executeTransactionCallback().then(function() {
            done(new Error('Should not resolve'));
          }, function(error) {
            expect(error.message).to.include('Cannot publish');
            done();
          });
        });
      })
    });
  });

  it('when processes "watch" message', function() {
    var onWatchStub = sinon.stub(plugin, 'onWatch', Promise.resolve);
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
          result: {
            status: 'preparing',
            stream: {
              id: 'channel-name',
              uid: 'channel-uid'
            }
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
    var onSwitchStub = sinon.stub(plugin, 'onSwitch', Promise.resolve);
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
    plugin.removeStream.returns(Promise.resolve());
    plugin.subscribe.returns(Promise.resolve());

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
          result: {
            current: {
              id: 'previous-channel-name',
              uid: 'previous-channel-uid'
            },
            next: {
              id: 'channel-name',
              uid: 'channel-uid'
            }
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
        expect(plugin.removeStream.calledOnce).to.be.equal(true);
        expect(plugin.subscribe.calledOnce).to.be.equal(true);
        done();
      });
    });
  });

  it('switch stream fail', function(done) {

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

    plugin.processMessage(switchRequest).then(function() {
      connection.transactions.execute(switchRequest.transaction, switchResponse).then(function() {
        expect(plugin.removeStream.called).to.be.equal(false);
        expect(plugin.subscribe.called).to.be.equal(false);
        done();
      });
    });
  });

  it('when processes "stopped" message.', function() {
    var onStoppedStub = sinon.stub(plugin, 'onStopped', Promise.resolve);
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

    plugin.removeStream.returns(Promise.resolve());
    plugin.processMessage(stoppedRequest).then(function() {
      expect(plugin.removeStream.calledOnce).to.be.equal(true);
      done();
    });
  });

  context('removes streams with the same channel on removeStream', function() {
    var stubHttpClient;

    before(function() {
      stubHttpClient = {
        detach: sinon.spy(function() {
          return Promise.resolve();
        })
      };
      serviceLocator.register('http-client', stubHttpClient);

      var stubCmApiClient = {
        removeStream: Promise.resolve,
        subscribe: Promise.resolve,
        publish: Promise.resolve
      };
      serviceLocator.register('cm-api-client', stubCmApiClient);

      serviceLocator.register('streams', new Streams());
    });

    after(function() {
      serviceLocator.unregister('http-client');
      serviceLocator.unregister('streams');
      serviceLocator.unregister('cm-api-client');
    });

    it('', function(done) {
      var stream1Publish = Stream.generate(new Channel('id1', 'name1', ''), plugin);
      var stream2 = Stream.generate(new Channel('id2', 'name2', ''), plugin);
      var subscribePlugin = new PluginVideo('', '', session);
      var stream1Subscribe = Stream.generate(new Channel('id1', 'name1', ''), subscribePlugin);
      var streams = serviceLocator.get('streams');
      streams.addSubscribe(stream2);
      streams.addSubscribe(stream1Subscribe);

      plugin.publish.restore();
      plugin.removeStream.restore();

      plugin.stream = stream1Publish;
      plugin.publish()
        .then(function() {
          return plugin.removeStream();
        })
        .then(function() {
          assert.equal(stubHttpClient.detach.callCount, 1);
          assert.isTrue(stubHttpClient.detach.withArgs(subscribePlugin).calledOnce);
          done();
        });
    });
  });

});
