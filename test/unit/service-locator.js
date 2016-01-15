var assert = require('chai').assert;
require('../helpers/globals');
var serviceLocator = require('../../lib/service-locator');
var sinon = require('sinon');

describe('serviceLocator', function() {

  it('registers/gets as a function', function() {
    var serviceKeyFunction = 'fun';
    var serviceValueFunction = 'foo';
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
    assert.isTrue(serviceSpy.calledOnce);

    delete serviceLocator.instances[serviceKeyFunction];
    delete serviceLocator.serviceRegistrars[serviceKeyFunction];
  });

  it('registers/gets as a value', function() {
    var serviceValueValue = 'bar';
    var serviceKeyValue = 'val';

    serviceLocator.register(serviceKeyValue, serviceValueValue);

    assert.strictEqual(serviceLocator.instances[serviceKeyValue], serviceValueValue);
    assert.strictEqual(serviceLocator.serviceRegistrars[serviceKeyValue], undefined);
    assert.strictEqual(serviceLocator.get(serviceKeyValue), serviceValueValue);

    delete serviceLocator.instances[serviceKeyValue];
  });

  it('Unregisters', function() {
    var serviceKey = 'val';

    serviceLocator.register(serviceKey, 'bar');
    assert(serviceLocator.get(serviceKey));
    serviceLocator.unregister(serviceKey);
    assert.throws(function() {
      serviceLocator.get(serviceKey);
    });
  });

});
