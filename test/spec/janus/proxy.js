var sinon = require('sinon');
var expect = require('chai').expect;
var Promise = require('bluebird');
var WebSocket = require('ws');
var EventEmitter = require('events');

require('../../helpers/globals');
var JanusProxy = require('../../../lib/janus/proxy');
var Streams = require('../../../lib/streams');
var serviceLocator = require('../../../lib/service-locator');

describe('JanusProxy', function() {

  var proxy, streams;

  beforeEach(function() {
    streams = new Streams();
    serviceLocator.register('streams', streams);
    proxy = new JanusProxy(8883, 'ws://localhost:8889');
  });

  after(function() {
    serviceLocator.unregister('streams');
  });

  it('should store listen port and janus address', function() {
    expect(proxy.port).to.be.equal(8883);
    expect(proxy.janusAddress).to.be.equal('ws://localhost:8889');
  });

  context('when started', function() {

    beforeEach(function(done) {
      sinon.stub(streams, 'unregisterAll', Promise.resolve);
      proxy.start().then(done, done);
    });

    it('when receives connection from client should open connection to janus', function(done) {
      var janusServer = new WebSocket.Server({port: 8889});
      janusServer.on('connection', function() {
        done();
      });
      new WebSocket('ws://localhost:' + proxy.port + '/origin');
    });
  });

  context('with established connection', function() {
    var connection, fromClientConnection, toJanusConnection;

    beforeEach(function() {
      fromClientConnection = new EventEmitter();
      fromClientConnection.send = sinon.stub();
      fromClientConnection.isOpened = sinon.stub();
      fromClientConnection.close = sinon.stub();
      fromClientConnection.getUrlObject = sinon.stub().returns({query: {}});
      toJanusConnection = new EventEmitter();
      toJanusConnection.send = sinon.stub();
      toJanusConnection.isOpened = sinon.stub();
      toJanusConnection.close = sinon.stub();
      connection = proxy.establishConnection(fromClientConnection, toJanusConnection);
      sinon.stub(connection, 'processMessage');
      sinon.stub(proxy, 'handleError');
    });

    context('when receives client message', function() {
      beforeEach(function() {
        connection.processMessage.restore();
        sinon.stub(connection, 'processMessage', function() {
          return Promise.resolve('altered-body')
        });
      });

      it('should process message', function() {
        fromClientConnection.emit('message', 'body');
        expect(connection.processMessage.calledOnce).to.be.equal(true);
      });

      it('should send it to janus connection', function(done) {
        fromClientConnection.emit('message', 'body');
        connection.processMessage.firstCall.returnValue.finally(function() {
          expect(toJanusConnection.send.withArgs('altered-body').calledOnce).to.be.equal(true);
          done();
        });
      });

      context('when it is rejected', function() {
        beforeEach(function() {
          connection.processMessage.restore();
          sinon.stub(connection, 'processMessage', function() {
            return Promise.reject('error-instance');
          });
        });

        it('should be handled as error', function(done) {
          fromClientConnection.emit('message', 'body');
          setTimeout(function() {
            connection.processMessage.firstCall.returnValue.catch(function() {
              expect(proxy.handleError.withArgs('error-instance').calledOnce).to.be.equal(true);
              done();
            });
          }, 0);
        });
      });
    });

    context('when receives janus message', function() {
      beforeEach(function() {
        connection.processMessage.restore();
        sinon.stub(connection, 'processMessage', function() {
          return Promise.resolve('altered-body')
        });
      });

      it('should process message', function() {
        toJanusConnection.emit('message', 'body');
        expect(connection.processMessage.calledOnce).to.be.equal(true);
      });

      it('should send it to client connection', function(done) {
        toJanusConnection.emit('message', 'body');
        connection.processMessage.firstCall.returnValue.finally(function() {
          expect(fromClientConnection.send.withArgs('altered-body').calledOnce).to.be.equal(true);
          done();
        });
      });

      context('when it is rejected', function() {
        beforeEach(function() {
          connection.processMessage.restore();
          sinon.stub(connection, 'processMessage', function() {
            return Promise.reject('error-instance');
          });
        });

        it('should be handled as error', function(done) {
          toJanusConnection.emit('message', 'body');
          setTimeout(function() {
            connection.processMessage.firstCall.returnValue.catch(function() {
              expect(proxy.handleError.withArgs('error-instance').calledOnce).to.be.equal(true);
              done();
            });
          }, 0);
        });
      });
    });

    context('when janus connection is closed', function() {
      it('should remove all listeners', function() {
        sinon.stub(toJanusConnection, 'removeAllListeners');
        toJanusConnection.emit('close');
        expect(toJanusConnection.removeAllListeners.callCount).to.be.equal(1);
      });

      it('should remove connection from connections collection', function() {
        sinon.stub(proxy, 'removeConnection');
        toJanusConnection.emit('close');
        expect(proxy.removeConnection.withArgs(connection).callCount).to.be.equal(1);
      });

      context('when client connection opened', function() {
        it('should close client connection', function() {
          fromClientConnection.isOpened.returns(true);
          toJanusConnection.emit('close');
          expect(fromClientConnection.close.callCount).to.be.equal(1);
        });
      });
      context('when client connection is not opened', function() {
        it('should not close client connection', function() {
          fromClientConnection.isOpened.returns(false);
          toJanusConnection.emit('close');
          expect(fromClientConnection.close.callCount).to.be.equal(0);
        });
      });
    });

    context('when client connection is closed', function() {
      it('should remove all listeners', function() {
        sinon.stub(fromClientConnection, 'removeAllListeners');
        fromClientConnection.emit('close');
        expect(fromClientConnection.removeAllListeners.callCount).to.be.equal(1);
      });

      it('should remove connection from connections collection', function() {
        sinon.stub(proxy, 'removeConnection');
        fromClientConnection.emit('close');
        expect(proxy.removeConnection.withArgs(connection).callCount).to.be.equal(1);
      });

      context('when janus connection opened', function() {
        it('should close janus connection', function() {
          toJanusConnection.isOpened.returns(true);
          fromClientConnection.emit('close');
          expect(toJanusConnection.close.callCount).to.be.equal(1);
        });
      });
      context('when janus connection is not opened', function() {
        it('should not close janus connection', function() {
          toJanusConnection.isOpened.returns(false);
          fromClientConnection.emit('close');
          expect(toJanusConnection.close.callCount).to.be.equal(0);
        });
      });
    });

    context('when browser triggers error', function() {
      it('should be handled as error', function() {
        var error = new Error('foo');
        fromClientConnection.emit('error', error);
        expect(proxy.handleError.withArgs(error).callCount).to.be.equal(1);
      });
    });

    context('when janus triggers error', function() {
      it('should be handled as error', function() {
        var error = new Error('foo');
        toJanusConnection.emit('error', error);
        expect(proxy.handleError.withArgs(error).callCount).to.be.equal(1);
      });
    });
  });
});
