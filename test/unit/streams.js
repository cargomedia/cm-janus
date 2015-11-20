var assert = require('chai').assert;
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var ProxyConnection = require('../../lib/proxy-connection');
var sinon = require('sinon');
var _ = require('underscore');


describe('streams', function() {

  it('add', function() {
    var streams = new Streams();
    var stream = new Stream('foo', 'bar', sinon.mock(ProxyConnection));

    assert.strictEqual(_.size(streams.list), 0);
    streams.add(stream);

    assert.strictEqual(_.size(streams.list), 1);
    assert.equal(streams.list['foo'], stream);
  });

  it('remove', function() {
    var streams = new Streams();
    var stream = new Stream('foo', 'bar', sinon.mock(ProxyConnection));
    streams.list = {foo: stream};
    assert.strictEqual(_.size(streams.list), 1);
    streams.remove(stream);
    assert.strictEqual(_.size(streams.list), 0);
  });

  it('find', function() {
    var streams = new Streams();
    var stream = new Stream('foo', 'bar', sinon.mock(ProxyConnection));
    streams.list = {foo: stream};
    assert.strictEqual(streams.find('foo'), stream);
  });

  it('findAllByConnection', function() {
    var streams = new Streams();
    var connection1 = sinon.mock(ProxyConnection);
    var connection2 = sinon.mock(ProxyConnection);
    var connection3 = sinon.mock(ProxyConnection);

    var stream1 = sinon.mock(Stream);
    stream1.proxyConnection = connection1;
    var stream2 = sinon.mock(Stream);
    stream2.proxyConnection = connection3;
    var stream3 = sinon.mock(Stream);
    stream3.proxyConnection = connection1;
    streams.list = {
      foo: stream1,
      bar: stream2,
      zoo: stream3
    };

    var equalArray = function(array1, array2) {
      assert.instanceOf(array1, Array);
      assert.instanceOf(array2, Array);
      assert.strictEqual(array1.length, array2.length, 'Arrays must have the same length');
      return _.each(array1, function(element, index) {
        assert.strictEqual(element, array2[index], 'array1[' + index + '] doesnt match array2[' + index + ']');
      });
    };
    equalArray(streams.findAllByConnection(connection1), [stream1, stream3]);
    equalArray(streams.findAllByConnection(connection2), []);
    equalArray(streams.findAllByConnection(connection3), [stream2]);
  });

});
