var assert = require('chai').assert;
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var JanusConnection = require('../../lib/janus/connection');
var sinon = require('sinon');
var _ = require('underscore');

assert.equalArray = function(array1, array2) {
  assert.instanceOf(array1, Array);
  assert.instanceOf(array2, Array);
  assert.strictEqual(array1.length, array2.length, 'Arrays must have the same length');
  return _.each(array1, function(element, index) {
    assert.strictEqual(element, array2[index], 'array1[' + index + '] doesnt match array2[' + index + ']');
  });
};


describe('streams', function() {

  it('add', function() {
    var stream1 = sinon.createStubInstance(Stream);
    stream1.id = 'foo';
    var stream2 = sinon.createStubInstance(Stream);
    stream2.id = 'bar';

    var streams = new Streams();
    assert.strictEqual(_.size(streams.list), 0);
    streams.add(stream1);

    assert.strictEqual(_.size(streams.list), 1);
    assert.equal(streams.list['foo'], stream1);

    streams.add(stream1);
    assert.strictEqual(_.size(streams.list), 1);

    streams.add(stream2);
    assert.strictEqual(_.size(streams.list), 2);
    assert.equal(streams.list['bar'], stream2);

    assert.throws(function() {
      streams.add(sinon.stub());
    });
  });

  it('remove', function() {
    var stream = sinon.createStubInstance(Stream);
    stream.id = 'foo';

    var streams = new Streams();
    streams.list[stream.id] = stream;
    assert.strictEqual(_.size(streams.list), 1);

    streams.remove(stream);
    assert.strictEqual(_.size(streams.list), 0);

    assert.throws(function() {
      streams.remove(stream);
    });
  });

  it('find', function() {
    var streams = new Streams();
    var stream = sinon.createStubInstance(Stream);
    stream.id = 'foo';
    streams.list[stream.id] = stream;
    assert.strictEqual(streams.find('foo'), stream);
    assert.strictEqual(streams.find('bar'), null);
  });
});
