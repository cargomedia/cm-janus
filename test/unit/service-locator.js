var assert = require('chai').assert;
var serviceLocator = require('../../lib/service-locator');

describe('serviceLocator', function() {
  var serviceFunctionVal = 'foo';
  var callCounter = 0;

  var serviceFunction = function() {
    callCounter++;
    return serviceFunctionVal;
  };
  var serviceValue = 'bar';

  var funKey = 'fun';
  var valKey = 'val';

  it('registers function', function() {
    serviceLocator.register(funKey, serviceFunction);

    assert.strictEqual(serviceLocator.instances[funKey], undefined);
    assert.strictEqual(serviceLocator.serviceRegistrars[funKey], serviceFunction);
  });

  it('registers value', function() {
    serviceLocator.register(valKey, serviceValue);

    assert.strictEqual(serviceLocator.instances[valKey], serviceValue);
    assert.strictEqual(serviceLocator.serviceRegistrars[valKey], undefined);
  });

  it('gets service from value', function() {
    assert.strictEqual(serviceLocator.get(valKey), serviceValue);
  });

  it('gets service from function', function() {
    assert.strictEqual(serviceLocator.get(funKey), serviceFunctionVal);
    assert.strictEqual(serviceLocator.instances[funKey], serviceFunctionVal);
  });

  it('gets function service lazily', function() {
    assert.strictEqual(serviceLocator.get(funKey), serviceFunctionVal);
    assert.strictEqual(callCounter, 1);
  });
});
