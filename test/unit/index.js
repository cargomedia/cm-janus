var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');
var serviceLocator = require('../../lib/service-locator');
var Application = require('../../lib/index');
var Stream = require('../../lib/stream');

describe('Application', function() {

  before(function() {
    serviceLocator.register('streams', {
      'getList': function() {
        return [new Stream('foo', 'bar', null), new Stream('baz', 'quux', null)];
      }
    });
  });

  after(function() {
    serviceLocator.reset();
  });

  it('should remove streams on close', function() {
    var removeStreamSpy = sinon.stub();
    serviceLocator.register('cm-api-client', {
      'removeStream': removeStreamSpy
    });
    var app = new Application();
    app._cleanupStreams();

    assert.equal(removeStreamSpy.callCount, 2);
    assert.isTrue(removeStreamSpy.calledWithExactly('bar', 'foo'));
    assert.isTrue(removeStreamSpy.calledWithExactly('quux', 'baz'));
  });
});
