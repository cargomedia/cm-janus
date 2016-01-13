var sinon = require('sinon');
var assert = require('chai').assert;

var JobHandlerRegistry = require('../../../lib/job/handler-registry');

describe('JobHandlerRegistry', function() {

  it('register', function() {
    var registry = new JobHandlerRegistry();
    var handler = sinon.stub();
    assert.deepEqual(registry.list, []);

    registry.register(handler);
    assert.deepEqual(registry.list, [handler]);
  });

  it('get', function() {
    var registry = new JobHandlerRegistry();
    var handler = {
      jobClass: {
        getPlugin: function() {
          return 'foo';
        },
        getEvent: function() {
          return 'bar';
        }
      }
    };
    registry.register(handler);

    assert.equal(registry.get('foo', 'bar'), handler);
    assert.throw(function() {
      registry.get('invalid-plugin', 'invalid-event');
    }, Error, /No handler found/)
  });

  it('registerFromConfiguration', function() {
    var config = {
      'janus.plugin.cm.audioroom:audio-recording-finished': {
        convertCommand: 'ls -al'
      }
    };
    var registry = new JobHandlerRegistry();
    registry.registerFromConfiguration(config);
  });
});
