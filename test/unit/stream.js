var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
require('../helpers/global-error-handler');

var Stream = require('../../lib/stream');
var PluginAbstract = require('../../lib/janus/plugin/abstract');

describe('Stream', function() {

  it('constructor', function() {
    var plugin = sinon.createStubInstance(PluginAbstract);
    var stream = new Stream('foo', 'bar', 'zoo', plugin);

    assert.strictEqual(stream.id, 'foo');
    assert.strictEqual(stream.channelName, 'bar');
    assert.strictEqual(stream.channelData, 'zoo');
    assert.strictEqual(stream.plugin, plugin);
    assert.closeTo(stream.start.getTime(), Date.now(), 1);
  });

  it('generate', function() {
    var plugin = sinon.createStubInstance(PluginAbstract);
    var stream = Stream.generate('foo', 'bar', plugin);

    assert.strictEqual(_.isString(stream.id), true);
    assert.strictEqual(stream.channelName, 'foo');
    assert.strictEqual(stream.channelData, 'bar');
    assert.strictEqual(stream.plugin, plugin);
  });
});
