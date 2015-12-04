var _ = require('underscore');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var sinon = require('sinon');

var Promise = require('bluebird');
require('../../helpers/global-error-handler');
var JanusConnection = require('../../../lib/janus/connection');
var Connection = require('../../../lib/connection');
var Transactions = require('../../../lib/janus/transactions');
var Logger = require('../../../lib/logger');
var Stream = require('../../../lib/stream');
var Streams = require('../../../lib/streams');
var Session = require('../../../lib/janus/session');
var CmApiClient = require('../../../lib/cm-api-client');
var serviceLocator = require('../../../lib/service-locator');


describe('JanusConnection', function() {
  var connection, browserConnection, janusConnection;

  beforeEach(function() {
    serviceLocator.register('logger', sinon.stub(new Logger));
    browserConnection = sinon.createStubInstance(Connection);
    janusConnection = sinon.createStubInstance(Connection);
    connection = new JanusConnection('connection-id', browserConnection, janusConnection);
  });

  it('should store id and janus, browser connections', function() {
    expect(connection.id).to.be.equal('connection-id');
    expect(connection.browserConnection).to.be.equal(browserConnection);
    expect(connection.janusConnection).to.be.equal(janusConnection);
  });

  it('should have empty session', function() {
    expect(connection.session).to.be.equal(null);
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
      var transactionCallback = connection.transactions.add.firstCall.args[1];
      transactionCallback({
        janus: 'success',
        data: {
          id: 'session-id'
        }
      });
      expect(connection.session).to.be.instanceof(Session);
      expect(connection.session.id).to.be.equal('session-id');
      expect(connection.session.data).to.be.equal('token');
    });
  });

  context('when processes "destroy" message"', function() {

    beforeEach(function() {
      var message = {
        janus: 'destroy',
        sessionId: 'session-id'
      };
      sinon.spy(connection.transactions, 'add');
      connection.session = sinon.createStubInstance(Session);
      connection.processMessage(message);
    });

    it('transaction should be added', function() {
      assert(connection.transactions.add.calledOnce);
    });

    context('on successful transaction response', function() {
      beforeEach(function() {
        var transactionCallback = connection.transactions.add.firstCall.args[1];
        transactionCallback({
          janus: 'success'
        });
      });

      it('should remove session', function() {
        expect(connection.session).to.be.equal(null);
      });
    });
  });

  context('when processes session-related message', function() {
    var message = {
      janus: 'event',
      session_id: 'session-id'
    };

    it('should proxy message to session', function() {
      connection.session = new Session(connection, 'session-id');
      sinon.stub(connection.session, 'processMessage').returns(Promise.resolve());

      connection.processMessage(message);
      assert(connection.session.processMessage.withArgs(message).calledOnce);
    });

    it('should reject on non-existing session', function(done) {
      expect(connection.processMessage(message)).to.be.eventually.rejectedWith(Error, 'Invalid session').and.notify(done);
    });
  });

  context('when is removed', function() {
    var streams;
    beforeEach(function() {
      streams = sinon.createStubInstance(Streams);
      streams.findAllByConnection.returns([]);
      serviceLocator.register('streams', streams);
    });

    it('should close all related streams', function() {
      var cmApiClient = sinon.createStubInstance(CmApiClient);
      serviceLocator.register('cm-api-client', cmApiClient);

      var stream = sinon.createStubInstance(Stream);
      stream.id = 'foo';
      stream.channelName = 'bar';
      streams.findAllByConnection.returns([stream]);

      connection.onRemove();
      assert(streams.findAllByConnection.withArgs(connection).calledOnce);
      assert(streams.remove.withArgs(stream).calledOnce);
      expect(cmApiClient.removeStream.firstCall.args).to.be.deep.equal(['bar', 'foo']);
    });

    it('should clear session', function() {
      connection.onRemove();
      expect(connection.session).to.be.equal(null);
    });
  });
});
