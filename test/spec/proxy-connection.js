var _ = require('underscore');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var sinon = require('sinon');
var Promise = require('bluebird');
require('../helpers/global-error-handler');
var WebSocketServer = require('../helpers/websocket').Server;
var WebSocket = require('../helpers/websocket').Client;
var JanusError = require('../../lib/janus-error');
var ProxyConnection = require('../../lib/proxy-connection');
var BrowserConnection = require('../../lib/browser-connection');
var JanusConnection = require('../../lib/janus-connection');
var Transactions = require('../../lib/transactions');
var PluginVideo = require('../../lib/plugin/video');
var Logger = require('../../lib/logger');
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var Session = require('../../lib/session');
var CmApiClient = require('../../lib/cm-api-client');
var serviceLocator = require('../../lib/service-locator');


describe('ProxyConnection', function() {
  var connection, browserConnection, janusConnection;

  beforeEach(function() {
    serviceLocator.register('logger', sinon.stub(new Logger));
    browserConnection = sinon.createStubInstance(BrowserConnection);
    janusConnection = sinon.createStubInstance(JanusConnection);
    connection = new ProxyConnection(browserConnection, janusConnection);
  });

  it('should store janus and browser connections', function() {
    expect(connection.browserConnection).to.be.equal(browserConnection);
    expect(connection.janusConnection).to.be.equal(janusConnection);
  });

  it('should have empty sessions collection', function() {
    expect(connection.sessions.size()).to.be.equal(0);
  });

  it('should have empty transactions collection', function() {
    expect(connection.transactions).to.be.instanceOf(Transactions);
    expect(_.size(connection.transactions.list)).to.be.equal(0);
  });

  context('when processes "create" message', function() {

    beforeEach(function() {
      var message = {
        janus: 'create',
        token: 'token'
      };
      sinon.spy(connection.transactions, 'add');
      connection.processMessage(message);
    });

    it('transaction should be added', function() {
      assert(connection.transactions.add.calledOnce);
    });

    it('on successful transaction response should add session', function() {
      sinon.stub(connection.sessions, 'add');
      var transactionCallback = connection.transactions.add.firstCall.args[1];
      transactionCallback({
        janus: 'success',
        data: {
          id: 'session-id'
        }
      });
      assert(connection.sessions.add.calledOnce);
      var session = connection.sessions.add.firstCall.args[0];
      expect(session).to.be.instanceof(Session);
      expect(session.id).to.be.equal('session-id');
      expect(session.data).to.be.equal('token');
    });
  });

  context('when processes "destroy" message"', function() {

    beforeEach(function() {
      var message = {
        janus: 'destroy',
        sessionId: 'session-id'
      };
      sinon.spy(connection.transactions, 'add');
      connection.processMessage(message);
    });

    it('transaction should be added', function() {
      assert(connection.transactions.add.calledOnce);
    });

    context('on successful transaction response', function() {
      beforeEach(function() {
        sinon.stub(connection, 'close');
        sinon.stub(connection.sessions, 'removeById');
        var transactionCallback = connection.transactions.add.firstCall.args[1];
        transactionCallback({
          janus: 'success'
        });
      });

      it('should remove session', function() {
        assert(connection.sessions.removeById.calledOnce);
        expect(connection.sessions.removeById.firstCall.args[0]).to.be.equal('session-id');
      });

      it('should close connection', function() {
        assert(connection.close.calledOnce);
      });
    });
  });

  context('when processes session-related message', function() {
    var message = {
      janus: 'event',
      sessionId: 'session-id'
    };

    it('should proxy message to session', function() {
      var session = sinon.createStubInstance(Session);
      session.processMessage.returns(Promise.resolve());
      session.id = 'session-id';
      connection.sessions.add(session);

      connection.processMessage(message);
      assert(session.processMessage.withArgs(message).calledOnce);
    });

    it('should reject on non-existing session', function() {
      expect(connection.processMessage(message)).to.be.eventually.rejectedWith(JanusError.Error);
    });
});

  context('when closes', function() {
    var streams;
    beforeEach(function() {
      streams = sinon.createStubInstance(Streams);
      streams.findAllByConnection.returns([]);
      serviceLocator.register('streams', streams);

      browserConnection.isOpened.returns(false);
      janusConnection.isOpened.returns(false);

      sinon.spy(connection.sessions, 'clear');
      sinon.spy(connection.transactions, 'clear');
    });

    context('with open janusConnection', function() {
      beforeEach(function() {
        janusConnection.isOpened.returns(true);
        connection.close();
      });

      it('should close janusConnection', function() {
        assert(janusConnection.close.calledOnce);
      });

      it('should remove janusConnection listeners', function() {
        assert(janusConnection.removeAllListeners.calledOnce);
        expect(janusConnection.removeAllListeners.firstCall.args[0]).to.be.equal('message');
      });
    });

    context('with open browserConnection', function() {
      beforeEach(function() {
        browserConnection.isOpened.returns(true);
        connection.close();
      });

      it('should close browserConnection', function() {
        assert(browserConnection.close.calledOnce);
      });

      it('should remove browserConnection listeners', function() {
        assert(browserConnection.removeAllListeners.calledOnce);
        expect(browserConnection.removeAllListeners.firstCall.args[0]).to.be.equal('message');
      });
    });

    it('should close all related streams', function() {
      var cmApiClient = sinon.createStubInstance(CmApiClient);
      serviceLocator.register('cm-api-client', cmApiClient);

      var stream = sinon.createStubInstance(Stream);
      stream.id = 'foo';
      stream.channelName = 'bar';
      streams.findAllByConnection.returns([stream]);

      connection.close();
      assert(streams.findAllByConnection.withArgs(connection).calledOnce);
      assert(streams.remove.withArgs(stream).calledOnce);
      expect(cmApiClient.removeStream.firstCall.args).to.be.deep.equal(['bar', 'foo']);
    });

    it('should clear sessions', function() {
      connection.close();
      assert(connection.sessions.clear.calledOnce);
    });

    it('should clear transactions', function() {
      connection.close();
      assert(connection.transactions.clear.calledOnce);
    });
  });
});
