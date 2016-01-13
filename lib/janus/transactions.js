_ = require('underscore');
var Promise = require('bluebird');

function Transactions() {
  /** @type {Object} */
  this.list = {};
}

/**
 * @param {String} id
 * @param {Function} executeCallback
 */
Transactions.prototype.add = function(id, executeCallback) {
  if (this._has(id)) {
    throw new Error('Transaction with id: `' + id + '` already stored');
  }
  if (!(executeCallback instanceof Function)) {
    throw new Error('`executeCallback` must be `Function`');
  }
  this.list[id] = executeCallback;

};

/**
 * @param {String} id
 * @returns {Function|Null}
 */
Transactions.prototype.find = function(id) {
  if (!this._has(id)) {
    return null;
  }
  return this.list[id];
};

/**
 * @param {String} id
 * @param {Object} message
 * @returns {Promise}
 */
Transactions.prototype.execute = function(id, message) {
  var transaction = this.find(id);
  if (!transaction) {
    throw new Error('Transaction `' + id + '` not found');
  }

  switch (message['janus']) {
    case 'ack':
      return Promise.resolve(message);
    case 'error':
      this.remove(id);
      return Promise.resolve(message);
    default:
      return transaction.call(null, message).finally(function() {
        this.remove(id);
      }.bind(this));
  }
};

/**
 * @param {String} id
 */
Transactions.prototype.remove = function(id) {
  if (!this._has(id)) {
    throw new Error('Transaction with id: `' + id + "` doesn't exist");
  }
  delete this.list[id];
};

/**
 * @param {String} id
 * @returns {Boolean}
 */
Transactions.prototype._has = function(id) {
  return _.has(this.list, id);
};

module.exports = Transactions;
