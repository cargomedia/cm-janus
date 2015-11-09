function PeriodicTask(task, period) {
  this._task = task;
  this._period = period;
  this._nextTimeoutId = null;
}

PeriodicTask.prototype.reset = function() {
  this.stop();
  this._start();
};

PeriodicTask.prototype.stop = function() {
  clearTimeout(this._nextTimeoutId);
};

PeriodicTask.prototype._start = function() {
  this._nextTimeoutId = setTimeout(function() {
    this._task.call();
    this.start();
  }.bind(this), this._period);
};

module.exports = PeriodicTask;


