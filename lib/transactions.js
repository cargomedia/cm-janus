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
 */
Transactions.prototype.remove = function(id) {
  delete this.list[id];
};

module.exports = Transactions;
