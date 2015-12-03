var _ = require('underscore');
var libRequire = require('../../../lib/require');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var sinon = require('sinon');

var Promise = require('bluebird');
require('../../helpers/global-error-handler');
var ProxyConnection = libRequire('proxy-connection');
var PluginRegistry = libRequire('plugin/plugin-registry');
var PluginAbstract = libRequire('plugin/abstract');
var Transactions = libRequire('transactions');
var Logger = libRequire('logger');
var Session = libRequire('janus/session');
var serviceLocator = libRequire('service-locator');

describe('Session', function() {
  var session, proxyConnection;

  beforeEach(function() {
    serviceLocator.register('logger', sinon.stub(new Logger));
    proxyConnection = new ProxyConnection();
    session = new Session(proxyConnection, 'session-id', 'session-data');
    session.pluginRegistry = sinon.createStubInstance(PluginRegistry);
  });

  it('should store connection, id and data', function() {
    expect(session.proxyConnection).to.be.equal(proxyConnection);
    expect(session.id).to.be.equal('session-id');
    expect(session.data).to.be.equal('session-data');
  });

  it('should have empty plugins collection', function() {
    expect(session.plugins).to.be.deep.equal({});
  });

  context('when processes "attach" message', function() {

    beforeEach(function() {
      var message = {
        janus: 'attach',
        plugin: 'plugin-type',
        token: 'token'
      };
      sinon.spy(proxyConnection.transactions, 'add');
      session.pluginRegistry.instantiatePlugin.returns('plugin-instance');
      session.pluginRegistry.isAllowedPlugin.returns(true);
      session.processMessage(message);
    });

    it('transaction should be added', function() {
      assert(proxyConnection.transactions.add.calledOnce);
    });

    it('on successful transaction response should add session', function() {
      var transactionCallback = proxyConnection.transactions.add.firstCall.args[1];
      transactionCallback({
        janus: 'success',
        data: {
          id: 'plugin-id'
        }
      });
      assert(session.pluginRegistry.instantiatePlugin.withArgs('plugin-id', 'plugin-type', proxyConnection).calledOnce);
      expect(_.size(session.plugins)).to.be.equal(1);
      expect(session.plugins).to.have.property('plugin-id');
      expect(session.plugins['plugin-id']).to.be.equal('plugin-instance');
    });
  });

  context('when processes plugin-related message', function() {
    var message = {
      janus: 'message',
      handle_id: 'plugin-id'
    };

    it('should reject on non-existing plugin', function(done) {
      expect(session.processMessage(message)).to.be.eventually.rejectedWith(Error, 'Invalid plugin id').and.notify(done);
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
