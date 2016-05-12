var _ = require('underscore');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var sinon = require('sinon');
var Promise = require('bluebird');
require('../../helpers/globals');
var JanusConnection = require('../../../lib/janus/connection');
var Connection = require('../../../lib/connection');
var Transactions = require('../../../lib/janus/transactions');
var Session = require('../../../lib/janus/session');


describe('JanusConnection', function() {
  var connection, browserConnection, janusConnection;

  beforeEach(function() {
    browserConnection = sinon.createStubInstance(Connection);
    browserConnection.getUrlObject.returns({query: {}});
    janusConnection = sinon.createStubInstance(Connection);
    connection = new JanusConnection('connection-id', browserConnection, janusConnection);
  });

  it('should store id and janus, browser connections', function() {
    expect(connection.id).to.be.equal('connection-id');
    expect(connection.browserConnection).to.be.equal(browserConnection);
    expect(connection.janusConnection).to.be.equal(janusConnection);
  });

  it('should have empty session', function() {
    expect(connection._sessions).to.be.empty;
  });

  it('should have empty transactions collection', function() {
    expect(connection.transactions).to.be.instanceOf(Transactions);
    expect(_.size(connection.transactions.list)).to.be.equal(0);
  });

  context('when processes transaction-related message', function() {
    beforeEach(function() {
      connection.transactions.add('transaction-id', new Function());
      sinon.stub(connection.transactions, 'execute', function() {
        return Promise.resolve('transaction-resolved');
      })
    });

    it('transaction should be added', function(done) {
      var transactionRelatedMessage = {
        transaction: 'transaction-id',
        body: 'foo'
      };
      connection.processMessage(transactionRelatedMessage).then(function(resolvedWith) {
        expect(resolvedWith).to.be.equal('transaction-resolved');
        expect(connection.transactions.execute.withArgs('transaction-id', transactionRelatedMessage).calledOnce).to.be.equal(true);
        done();
      });
    });
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
      var transactionCallback = connection.transactions.add.firstCall.args[1];
      transactionCallback({
        janus: 'success',
        data: {
          id: 'session-id'
        }
      });

      expect(connection.hasSession('session-id')).to.be.true;
      var session = connection.getSession('session-id');
      expect(session).to.be.instanceof(Session);
      expect(session.id).to.be.equal('session-id');
      expect(session.data).to.be.equal('token');
    });
  });

  context('when processes "destroy" message"', function() {
    beforeEach(function() {
      var message = {
        janus: 'destroy',
        session_id: 'session-id'
      };
      sinon.spy(connection.transactions, 'add');
      var session = sinon.createStubInstance(Session);
      session.id = message.session_id;
      connection.addSession(session);
      session.onRemove.returns(Promise.resolve());
      connection.processMessage(message);
    });

    it('transaction should be added', function() {
      assert(connection.transactions.add.calledOnce);
    });

    context('on successful transaction response', function() {
      beforeEach(function(done) {
        var transactionCallback = connection.transactions.add.firstCall.args[1];
        transactionCallback({
          janus: 'success'
        }).then(function() {
          done()
        });
      });

      it('should remove session', function() {
        expect(connection._sessions).to.be.empty;
      });
    });
  });

  context('when processes "timeout" message"', function() {
    beforeEach(function(done) {
      var message = {
        janus: 'timeout',
        session_id: 'session-id'
      };
      var session = sinon.createStubInstance(Session);
      session.id = message.session_id;
      connection.addSession(session);
      session.onRemove.returns(Promise.resolve());
      connection.processMessage(message).then(function() {
        done()
      });
    });

    it('should remove session', function() {
      expect(connection._sessions).to.be.empty;
    });
  });

  context('when processes session-related message', function() {
    var message = {
      janus: 'event',
      session_id: 'session-id'
    };

    it('should proxy message to session', function() {
      var session = new Session(connection, 'session-id');
      connection.addSession(session);
      sinon.stub(session, 'processMessage').returns(Promise.resolve());

      connection.processMessage(message);
      assert(connection.getSession(session.id).processMessage.withArgs(message).calledOnce);
    });

    it('should reject on non-existing session', function(done) {
      connection.processMessage(message).then(function() {
        done(new Error('Should not resolve for unregistered session'));
      }, function() {
        done();
      });
    });
  });

  context('when is removed', function() {

    context('when session exists', function() {
      var sessionId = 'session-id';
      beforeEach(function() {
        var session = sinon.createStubInstance(Session);
        session.id = sessionId;
        connection.addSession(session);
        connection.getSession(sessionId).onRemove.returns(Promise.resolve());
      });

      it('should trigger session onRemove', function() {
        var session = connection.getSession(sessionId);
        connection.onRemove();
        assert(session.onRemove.calledOnce)
      });

      it('should clear session', function() {
        connection.onRemove().then(function() {
          expect(connection.getSession(sessionId)).to.be.undefined;
          expect(connection._sessions).to.be.empty;
        });
      });
    });
  });

  context('context', function() {

    it('should contain connection id', function() {
      expect(connection.getContext().fields.janus.connectionId).to.be.equal('connection-id');
    });

    context('when connection query context present', function() {
      beforeEach(function() {
        browserConnection.getUrlObject.returns({
          query: {
            context: JSON.stringify({user: 'user-id'})
          }
        });
      });

      it('should contain connection', function() {
        expect(connection.getContext().fields.user).to.be.equal('user-id');
      });
    });
  });

});
