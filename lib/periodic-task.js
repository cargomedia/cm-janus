function PeriodicTask(task, period) {
  this._task = task;
  this._period = period;
  this._nextTimeoutId = null;
}

PeriodicTask.prototype.run = function() {
  this.stop();
  this._start();
};

PeriodicTask.prototype.stop = function() {
  clearTimeout(this._nextTimeoutId);
  this._nextTimeoutId = null;
};

PeriodicTask.prototype._start = function() {
  this._nextTimeoutId = setTimeout(function() {
    if (false !== this._task.call()) {
      this._start();
    }
  }.bind(this), this._period);
};

module.exports = PeriodicTask;
