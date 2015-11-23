var assert = require('chai').assert;
require('../helpers/global-error-handler');
var Transactions = require('../../lib/transactions');
var Promise = require('bluebird');

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

  it('execute', function(done) {
    var transaction = function() {
      return new Promise.resolve();
    };
    var transactions = new Transactions();
    transactions.add('foo', transaction);
    assert.notStrictEqual(transactions.find('foo'), null);

    transactions.execute('foo', {janus: 'ack'})
      .then(function() {
        assert.notStrictEqual(transactions.find('foo'), null);
      })
      .then(function() {
        return transactions.execute('foo', {janus: 'event'});
      })
      .then(function() {
        assert.strictEqual(transactions.find('foo'), null);
        done();
      })
  });

  it('execute with error', function(done) {
    var transaction = function() {
      return new Promise.resolve();
    };
    var transactions = new Transactions();
    transactions.add('foo', transaction);
    assert.notStrictEqual(transactions.find('foo'), null);

    transactions.execute('foo', {janus: 'error'})
      .then(function() {
        assert.strictEqual(transactions.find('foo'), null);
        done();
      })
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
