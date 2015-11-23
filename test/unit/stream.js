var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
require('../helpers/global-error-handler');

var Stream = require('../../lib/stream');
var ProxyConnection = require('../../lib/proxy-connection');

describe('Transactions', function() {

  it('constructor', function() {
    var proxyConnection = sinon.createStubInstance(ProxyConnection);
    var stream = new Stream('foo', 'bar', proxyConnection);

    assert.strictEqual(stream.id, 'foo');
    assert.strictEqual(stream.channelName, 'bar');
    assert.strictEqual(stream.proxyConnection, proxyConnection);
  });

  it('generate', function() {
    var proxyConnection = sinon.createStubInstance(ProxyConnection);
    var stream = Stream.generate('foo', proxyConnection);

    assert.strictEqual(_.isString(stream.id), true);
    assert.strictEqual(stream.channelName, 'foo');
    assert.strictEqual(stream.proxyConnection, proxyConnection);
  });
});
