var assert = require('chai').assert;
var util = require('util');
require('../helpers/global-error-handler');
var PluginAbstract = require('../../lib/plugin/abstract');
var PluginRegistry = require('../../lib/plugin/plugin-registry');

describe('Plugin registry', function() {

  it('register plugins', function() {
    var CorrectPlugin = function() {
      PluginAbstract.apply(this, arguments);
    };
    CorrectPlugin.TYPE = 'correct';
    util.inherits(CorrectPlugin, PluginAbstract);
    var registry = new PluginRegistry([CorrectPlugin]);
    var pluginId = 'id';
    var plugin = registry.instantiatePlugin(pluginId, CorrectPlugin.TYPE, null);
    assert.instanceOf(plugin, CorrectPlugin);
    assert.equal(plugin.id, 'id');
    assert.equal(plugin.type, CorrectPlugin.TYPE);

    registry = new PluginRegistry();
    registry.registerPlugin(CorrectPlugin);
    pluginId = 'id2';
    plugin = registry.instantiatePlugin(pluginId, CorrectPlugin.TYPE, null);
    assert.instanceOf(plugin, CorrectPlugin);
    assert.equal(plugin.id, pluginId);
    assert.equal(plugin.type, CorrectPlugin.TYPE);
  });

  it('Does not register invalid plugins', function() {
    var NoTypePlugin = function() {
      PluginAbstract.apply(this, arguments);
    };
    util.inherits(NoTypePlugin, PluginAbstract);
    var registry = new PluginRegistry();
    assert.throw(function() {
      registry.registerPlugin(NoTypePlugin);
    }, /TYPE/);

    var NoFunctionPlugin = {};
    assert.throw(function() {
      registry.registerPlugin(NoFunctionPlugin);
    }, /instantiable/);
  });

  it('Does not create unregistered plugins', function() {
    var RegisteredPlugin = function() {
    };
    RegisteredPlugin.TYPE = 'registered';
    var UnregisteredPlugin = function() {
    };
    UnregisteredPlugin.TYPE = 'unregistered';
    var registry = new PluginRegistry();

    assert.throw(function() {
      registry.getPlugin(UnregisteredPlugin.TYPE);
    }, /Invalid/);

    registry.registerPlugin(RegisteredPlugin);
    assert.throw(function() {
      registry.getPlugin(UnregisteredPlugin.TYPE);
    }, /Invalid/);
  });

});
