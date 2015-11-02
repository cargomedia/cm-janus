function Transactions() {
  this.list = {};
}

/**
 * @param {Transaction} transaction
 */
Transactions.prototype.add = function(transaction) {
  this.list[transaction.id] = transaction;

  var self = this;
  transaction.on('remove', function() {
    self.remove(transaction);
  });

};

/**
 * @param {String} id
 * @returns {Transaction}
 */
Transactions.prototype.find = function(id) {
  return this.list[id];
};

/**
 * @param {Transaction} transaction
 */
Transactions.prototype.remove = function(transaction) {
  delete this.list[transaction.id];
};

module.exports = new Transactions();
