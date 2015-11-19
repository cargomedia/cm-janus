var assert = require('chai').assert;
var serviceLocator = require('../../lib/service-locator');
var sinon = require('sinon');

describe('serviceLocator', function() {
  var serviceValueFunction = 'foo';
  var serviceValueValue = 'bar';

  var serviceKeyFunction = 'fun';
  var serviceKeyValue = 'val';

  it('registers/gets as a function', function() {
    var serviceFunction = function() {
      return serviceValueFunction;
    };
    var serviceSpy = sinon.spy(serviceFunction);

    serviceLocator.register(serviceKeyFunction, serviceSpy);

    assert.strictEqual(serviceLocator.instances[serviceKeyFunction], undefined);
    assert.strictEqual(serviceLocator.serviceRegistrars[serviceKeyFunction], serviceSpy);

    assert.strictEqual(serviceLocator.get(serviceKeyFunction), serviceValueFunction);
    assert.strictEqual(serviceLocator.instances[serviceKeyFunction], serviceValueFunction);

    assert.strictEqual(serviceLocator.get(serviceKeyFunction), serviceValueFunction);
    assert.strictEqual(serviceSpy.callCount, 1);
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
