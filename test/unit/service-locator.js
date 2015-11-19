var assert = require('chai').assert;
var serviceLocator = require('../../lib/service-locator');

describe('serviceLocator', function() {
  var serviceValueFunction = 'foo';
  var serviceValueValue = 'bar';

  var serviceKeyFunction = 'fun';
  var serviceKeyValue = 'val';

  var callCounter = 0;
  var serviceFunction = function() {
    callCounter++;
    return serviceValueFunction;
  };

  it('registers function', function() {
    serviceLocator.register(serviceKeyFunction, serviceFunction);

    assert.strictEqual(serviceLocator.instances[serviceKeyFunction], undefined);
    assert.strictEqual(serviceLocator.serviceRegistrars[serviceKeyFunction], serviceFunction);
  });

  it('registers value', function() {
    serviceLocator.register(serviceKeyValue, serviceValueValue);

    assert.strictEqual(serviceLocator.instances[serviceKeyValue], serviceValueValue);
    assert.strictEqual(serviceLocator.serviceRegistrars[serviceKeyValue], undefined);
  });

  it('gets service from value', function() {
    assert.strictEqual(serviceLocator.get(serviceKeyValue), serviceValueValue);
  });

  it('gets service from function', function() {
    assert.strictEqual(serviceLocator.get(serviceKeyFunction), serviceValueFunction);
    assert.strictEqual(serviceLocator.instances[serviceKeyFunction], serviceValueFunction);
  });

  it('gets function service lazily', function() {
    assert.strictEqual(serviceLocator.get(serviceKeyFunction), serviceValueFunction);
    assert.strictEqual(callCounter, 1);
  });

});
