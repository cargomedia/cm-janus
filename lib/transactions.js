function Transactions() {
  this.list = {};
}

/**
 * @param {String} id
 * @param {Function} transaction
 */
Transactions.prototype.add = function(id, transaction) {
  this.list[id] = transaction;

};

/**
 * @param {String} id
 * @returns {Function}
 */
Transactions.prototype.find = function(id) {
  return this.list[id];
};

/**
 * @param {Function} transaction
 * @param {Object} message
 */
Transactions.prototype.execute = function(transaction, message) {
  if ('ack' != message['janus']) {
    transaction.call(null, message);
    this.remove(message.transaction);
  }
};

/**
 * @param {Function} id
 */
Transactions.prototype.remove = function(id) {
  delete this.list[id];
};

module.exports = Transactions;
