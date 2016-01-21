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
var PluginRegistry = require('../../../lib/janus/plugin-registry');
var PluginAbstract = require('../../../lib/janus/plugin/abstract');
var Session = require('../../../lib/janus/session');

describe('Session', function() {
  var session, connection;

  beforeEach(function() {
    connection = new JanusConnection();
    session = new Session(connection, 'session-id', 'session-data');
    session.pluginRegistry = sinon.createStubInstance(PluginRegistry);
  });

  it('should store connection, id and data', function() {
    expect(session.connection).to.be.equal(connection);
    expect(session.id).to.be.equal('session-id');
    expect(session.data).to.be.equal('session-data');
  });

  it('should have empty plugins collection', function() {
    expect(session.plugins).to.be.deep.equal({});
  });

  context('when processes "attach" message', function() {
    var message;
    beforeEach(function() {
      message = {
        janus: 'attach',
        plugin: 'plugin-type',
        token: 'token'
      };
      sinon.spy(connection.transactions, 'add');
      session.pluginRegistry.instantiatePlugin.returns('plugin-instance');
    });

    context('with illegal plugin', function() {
      beforeEach(function() {
        session.pluginRegistry.isAllowedPlugin.returns(false);
      });

      it('should reject', function(done) {
        session.processMessage(message).then(function() {
          done(new Error('Should not resolve'));
        }, function(error) {
          expect(error.message).to.include('Illegal plugin to access');
          done();
        });
      });
    });

    context('with legal plugin', function() {
      beforeEach(function(done) {
        session.pluginRegistry.isAllowedPlugin.returns(true);
        session.processMessage(message).finally(done);
      });

      it('transaction should be added', function() {
        assert(connection.transactions.add.calledOnce);
      });

      it('on successful transaction response should add plugin', function() {
        var transactionCallback = connection.transactions.add.firstCall.args[1];
        transactionCallback({
          janus: 'success',
          data: {
            id: 'plugin-id'
          }
        });
        assert(session.pluginRegistry.instantiatePlugin.withArgs('plugin-id', 'plugin-type', session).calledOnce);
        expect(_.size(session.plugins)).to.be.equal(1);
        expect(session.plugins).to.have.property('plugin-id');
        expect(session.plugins['plugin-id']).to.be.equal('plugin-instance');
      });
    });
  });

  context('when processes "detached" message', function() {
    beforeEach(function() {
      var message = {
        janus: 'detached',
        sender: 'plugin-id',
        token: 'token'
      };
      sinon.stub(session, '_removePlugin');
      session.processMessage(message);
    });

    it('should remove plugin', function() {
      assert(session._removePlugin.withArgs('plugin-id').calledOnce);
    });
  });

  context('when removes plugin', function() {
    beforeEach(function() {
      session.plugins['plugin-id'] = sinon.createStubInstance(PluginAbstract);
      session.plugins['other-plugin-id'] = sinon.createStubInstance(PluginAbstract);
    });


    it('should remove it from plugins collection', function() {
      expect(_.size(session.plugins), 2);
      expect(session.plugins).to.have.property('plugin-id');
      session._removePlugin('plugin-id');
      expect(_.size(session.plugins), 1);
      expect(session.plugins).to.not.have.property('plugin-id');
    });

    it('should trigger onRemove', function() {
      var plugin = session.plugins['plugin-id'];
      session._removePlugin('plugin-id');
      assert(plugin.onRemove.calledOnce);
    });
  });

  context('when processes plugin-related message', function() {
    var message = {
      janus: 'message',
      handle_id: 'plugin-id'
    };

    it('should resolve on non-existing plugin', function(done) {
      session.processMessage(message).then(function() {
        done(new Error('Should not resolve for unregistered plugin'));
      }, function() {
        done();
      })
    });

    it('should proxy message to plugin', function() {
      var plugin = sinon.createStubInstance(PluginAbstract);
      session.plugins['plugin-id'] = plugin;
      plugin.processMessage.restore();
      sinon.stub(plugin, 'processMessage', function() {
        return Promise.resolve();
      });
      session.processMessage(message);
      assert(plugin.processMessage.withArgs(message).calledOnce);
    });
  });
});
