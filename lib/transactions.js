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
 * @param {String} id
 * @param {Object} message
 * @returns {Promise}
 */
Transactions.prototype.execute = function(id, message) {
  switch (message['janus']) {
    case 'ack':
      return Promise.resolve();
    case 'error':
      this.remove(id);
      return Promise.resolve();
    default:
      var transaction = this.find(id);
      if (transaction) {
        return transaction.call(null, message).finally(function() {
          this.remove(id);
        }.bind(this));
      } else {
        return Promise.reject(new Error('unknown transaction'));
      }
  }
};

/**
 * @param {Function} id
 */
Transactions.prototype.remove = function(id) {
  delete this.list[id];
};

module.exports = Transactions;
