function Transactions() {
  this.list = {};
}

/**
 * @param {String} id
 * @param {Function} executeCallback
 */
Transactions.prototype.add = function(id, executeCallback) {
  if (this.list[id]) {
    throw new Error('Tranasaction with id: `' + id + '` already stored');
  }
  this.list[id] = executeCallback;

};

/**
 * @param {String} id
 * @returns {Function}
 */
Transactions.prototype.find = function(id) {
  return this.list[id] || null;
};

/**
 * @param {String} id
 * @param {Object} message
 */
Transactions.prototype.execute = function(id, message) {
  var transaction = this.find(id);
  if (!transaction) {
    return;
  }
  if ('ack' === message['janus']) {
    return;
  }
  transaction.call(null, message);
  this.remove(id);
};

/**
 * @param {String} id
 */
Transactions.prototype.remove = function(id) {
  delete this.list[id];
};

module.exports = Transactions;
