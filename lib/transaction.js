function Transaction(done) {
  this._id = this._randomId();
  this._done = done;
}

Transaction.prototype.getId = function() {
  return this._id;
};

Transaction.prototype.done = function(message) {
  return this._done(message);
};

Transaction.prototype._randomId = function() {
  return Math.random().toString(36).slice(2);
};

module.exports = Transaction;
