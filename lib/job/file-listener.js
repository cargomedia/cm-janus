var path = require('path');
var Inotify = require('inotify').Inotify;
var EventEmitter = require('events');

function FileListener(jobsDirectory) {
  this._jobsDirectory = jobsDirectory;
  this._inotify = new Inotify();
  this._watch = null;
}

util.inherits(FileListener, EventEmitter);

FileListener.prototype.start = function() {
  this._emitEventsForOutstandingFiles();
  this._listenForNewFiles();
};

/**
 * @returns {Promise}
 */
FileListener.prototype.stop = function() {
  this._inotify.removeWatch(this._watch);
  return Promise.resolve();
};

FileListener.prototype._listenForNewFiles = function() {
  var self = this;
  this._watch = this._inotify.addWatch({
    path: this._jobsDirectory,
    watch_for: Inotify.IN_CLOSE_WRITE,
    callback: function(event) {
      if (event.name) {
        var filePath = path.join(this._jobsDirectory, event.name);
        self.emit('file', filePath);
      }
    }.bind(this)
  });
};

/**
 * @returns {Promise}
 */
FileListener.prototype._emitEventsForOutstandingFiles = function() {
  var self = this;
  return fs.readdir(this._jobsDirectory).then(function(files) {
    return Promise.all(files.map(function(basename) {
      var filePath = path.join(self._jobsDirectory, basename);
      self.emit('file', filePath);
      return Promise.resolve();
    }));
  });
};

module.exports = FileListener;
