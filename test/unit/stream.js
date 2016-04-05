var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
require('../helpers/globals');

var Stream = require('../../lib/stream');
var Context = require('../../lib/context');
var PluginAbstract = require('../../lib/janus/plugin/abstract');

describe('Stream', function() {

  it('constructor', function() {
    var plugin = sinon.createStubInstance(PluginAbstract);
    var context = new Context();
    var stream = new Stream('foo', 'channel', plugin, context);

    assert.strictEqual(stream.id, 'foo');
    assert.strictEqual(stream.channel, 'channel');
    assert.strictEqual(stream.plugin, plugin);
    assert.strictEqual(stream.context, context);
    assert.closeTo(stream.start.getTime(), Date.now(), 1);
  });

  it('generate', function() {
    var plugin = sinon.createStubInstance(PluginAbstract);
    var context = new Context();

    var stream = Stream.generate('channel', plugin, context);

    assert.strictEqual(_.isString(stream.id), true);
    assert.strictEqual(stream.channel, 'channel');
    assert.strictEqual(stream.plugin, plugin);
    assert.strictEqual(stream.context, context);
  });
});
