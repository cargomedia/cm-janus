var assert = require('chai').assert;
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var ProxyConnection = require('../../lib/janus/proxy-connection');
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

  it('findAllByConnection', function() {
    var streams = new Streams();
    var connection1 = sinon.createStubInstance(ProxyConnection);
    var connection2 = sinon.createStubInstance(ProxyConnection);
    var connection3 = sinon.createStubInstance(ProxyConnection);

    var stream1 = sinon.createStubInstance(Stream);
    stream1.proxyConnection = connection1;
    var stream2 = sinon.createStubInstance(Stream);
    stream2.proxyConnection = connection3;
    var stream3 = sinon.createStubInstance(Stream);
    stream3.proxyConnection = connection1;
    streams.list = {
      foo: stream1,
      bar: stream2,
      zoo: stream3
    };
    assert.equalArray(streams.findAllByConnection(connection1), [stream1, stream3]);
    assert.equalArray(streams.findAllByConnection(connection2), []);
    assert.equalArray(streams.findAllByConnection(connection3), [stream2]);

    assert.throws(function() {
      streams.findAllByConnection(sinon.stub());
    });
  });

});
