var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');


var Promise = require('bluebird');
var Stream = require('../../../../lib/stream');
var PluginAbstract = require('../../../../lib/janus/plugin/abstract');
var PluginStreaming = require('../../../../lib/janus/plugin/streaming');
var Connection = require('../../../../lib/janus/connection');
var Session = require('../../../../lib/janus/session');
var Logger = require('../../../../lib/logger');
var CmApiClient = require('../../../../lib/cm-api-client');
var Streams = require('../../../../lib/streams');
var serviceLocator = require('../../../../lib/service-locator');

describe('PluginStreaming', function() {
  var plugin, session, connection, cmApiClient, streams;

  beforeEach(function() {
    serviceLocator.register('logger', sinon.stub(new Logger));
    connection = new Connection('connection-id');
    session = new Session(connection, 'session-id', 'session-data');
    plugin = new PluginStreaming('plugin-id', 'plugin-type', session);
    session.plugins[plugin.id] = plugin;

    cmApiClient = sinon.createStubInstance(CmApiClient);
    serviceLocator.register('cm-api-client', cmApiClient);
    streams = sinon.createStubInstance(Streams);
    serviceLocator.register('streams', streams);
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
          expect(plugin.stream.channelName).to.be.equal('channel-name');
          expect(plugin.stream.plugin).to.be.equal(plugin);
          done();
        });
      });

      it('should publish', function(done) {
        executeTransactionCallback().finally(function() {
          expect(cmApiClient.publish.calledOnce).to.be.equal(true);
          var args = cmApiClient.publish.firstCall.args;
          expect(args[0]).to.be.equal('channel-name');
          expect(args[1]).to.be.a('string');
          expect(args[2]).to.be.closeTo(Date.now() / 1000, 5);
          expect(args[3]).to.be.equal('session-data');
          expect(args[4]).to.be.equal('channel-data');
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
            return Promise.reject(new Error('Cannot publish'));
          });
        });

        it('should detach');

        it('should reject', function(done) {
          executeTransactionCallback().then(function() {
            done(new Error('Should not resolve'));
          }, function(error) {
            expect(error.message).to.include('error: Cannot publish');
            done();
          });
        });
      })
    });
  });
});
