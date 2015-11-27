var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
require('../helpers/global-error-handler');

var Stream = require('../../lib/stream');
var PluginStreaming = require('.././streaming');

describe('Stream', function() {

  it('constructor', function() {
    var plugin = sinon.createStubInstance(PluginStreaming);
    var stream = new Stream('foo', 'bar', plugin);

    assert.strictEqual(stream.id, 'foo');
    assert.strictEqual(stream.channelName, 'bar');
    assert.strictEqual(stream.plugin, plugin);
  });

  it('generate', function() {
    var plugin = sinon.createStubInstance(PluginStreaming);
    var stream = Stream.generate('foo', plugin);

    assert.strictEqual(_.isString(stream.id), true);
    assert.strictEqual(stream.channelName, 'foo');
    assert.strictEqual(stream.plugin, plugin);
  });
});
