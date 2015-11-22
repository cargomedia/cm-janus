var assert = require('chai').assert;
require('../helpers/global-error-handler');
var Transactions = require('../../lib/transactions');

describe('Transactions', function() {

  it('add', function() {
    var transaction = new Function;
    var transactions = new Transactions();
    transactions.add('foo', transaction);
    assert.strictEqual(transactions.list['foo'], transaction);
    assert.throw(function() {
      transactions.add('foo', new Function);
    });
    assert.throw(function() {
      transactions.add('bar', 'bar');
    });
  });

  it('find', function() {
    var transaction = new Function();
    var transactions = new Transactions();
    transactions.list = {
      foo: transaction
    };
    assert.strictEqual(transactions.find('foo'), transaction);
    assert.strictEqual(transactions.find('bar'), null);
  });

  it('execute', function() {
    var transaction = new Function();
    var transactions = new Transactions();
    transactions.add('foo', transaction);
    assert.notStrictEqual(transactions.find('foo'), null);

    transactions.execute('foo', {janus: 'ack'});
    assert.notStrictEqual(transactions.find('foo'), null);

    transactions.execute('foo', {janus: 'event'});
    assert.strictEqual(transactions.find('foo'), null);

    transactions.execute('bar', null);
  });

  it('remove', function() {
    var transactions = new Transactions();
    transactions.list = {
      foo: new Function
    };
    assert.notStrictEqual(transactions.find('foo'), null);
    transactions.remove('foo');
    assert.strictEqual(transactions.find('foo'), null);
  });
});
