var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
require('../../../helpers/globals');
var PluginAbstract = require('../../../../lib/janus/plugin/abstract');
var Session = require('../../../../lib/janus/session');
var serviceLocator = require('../../../../lib/service-locator');

describe('PluginAbstract', function() {
  var plugin, session;

  before(function() {
    session = sinon.createStubInstance(Session);
    plugin = new PluginAbstract('plugin-id', 'type', session);
  });

  it('should store id, type and session', function() {
    expect(plugin.id).to.be.equal('plugin-id');
    expect(plugin.type).to.be.equal('type');
    expect(plugin.session).to.be.equal(session);
  });

  context('when processing message', function() {
    it('should resolve all messages', function(done) {
      var message = {janus: 'foo'};
      plugin.processMessage(message).then(function(resolvedMessage) {
        expect(resolvedMessage).to.be.equal(message);
        done();
      });
    });
  });

  context('when checking plugin response', function() {
    it('should detect success response', function() {
      var successMessage = {
        plugindata: {
          data: {
            foo: 'bar'
          }
        }
      };
      expect(plugin._isSuccessResponse(successMessage)).to.be.equal(true);
    });

    it('should detect invalid response', function() {
      var invalidMessage = {
        plugindata: {}
      };
      expect(plugin._isSuccessResponse(invalidMessage)).to.be.equal(false);
    });

    it('should detect error response', function() {
      var errorMessage = {
        plugindata: {
          data: {
            error: 'foo'
          }
        }
      };
      expect(plugin._isSuccessResponse(errorMessage)).to.be.equal(false);
    });
  });

  context('when removed', function() {
    it('should log about it', function() {
      var logger = serviceLocator.get('logger');
      sinon.spy(logger, 'info');
      plugin.onRemove();
      expect(logger.info.withArgs('removed plugin plugin-id').calledOnce);
      logger.info.restore();
    });
  })
});
