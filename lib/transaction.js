var EventEmitter = require('events');
var util = require('util');

function Transaction(id, onResponse) {
  this.id = id;
  this.onResponse = onResponse;
}

util.inherits(Transaction, EventEmitter);

Transaction.prototype.remove = function() {
  this.emit('remove');
};

module.exports = Transaction;
