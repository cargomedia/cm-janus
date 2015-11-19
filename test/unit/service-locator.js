var assert = require('chai').assert;
var serviceLocator = require('../../lib/service-locator');

describe('serviceLocator', function() {
  var serviceValueFunction = 'foo';
  var serviceValueValue = 'bar';

  var serviceKeyFunction = 'fun';
  var serviceKeyValue = 'val';

  it('registers/gets as a function', function() {
    var callCounter = 0;
    var serviceFunction = function() {
      callCounter++;
      return serviceValueFunction;
    };
    serviceLocator.register(serviceKeyFunction, serviceFunction);

    assert.strictEqual(serviceLocator.instances[serviceKeyFunction], undefined);
    assert.strictEqual(serviceLocator.serviceRegistrars[serviceKeyFunction], serviceFunction);

    assert.strictEqual(serviceLocator.get(serviceKeyFunction), serviceValueFunction);
    assert.strictEqual(serviceLocator.instances[serviceKeyFunction], serviceValueFunction);

    assert.strictEqual(serviceLocator.get(serviceKeyFunction), serviceValueFunction);
    assert.strictEqual(callCounter, 1);
  });

  it('registers/gets as a value', function() {
    serviceLocator.register(serviceKeyValue, serviceValueValue);

    assert.strictEqual(serviceLocator.instances[serviceKeyValue], serviceValueValue);
    assert.strictEqual(serviceLocator.serviceRegistrars[serviceKeyValue], undefined);
    assert.strictEqual(serviceLocator.get(serviceKeyValue), serviceValueValue);
  });

  after(function() {
    delete serviceLocator.serviceRegistrars[serviceKeyFunction];
    delete serviceLocator.instances[serviceKeyFunction];
    delete serviceLocator.instances[serviceKeyValue];
  });

});
