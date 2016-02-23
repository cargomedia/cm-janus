var util = require('util');
var path = require('path');
var Inotify = require('inotify').Inotify;
var EventEmitter = require('events');
var Promise = require('bluebird');
var fs_readdir = Promise.promisify(require('fs').readdir);

function FileListener(jobsDirectory) {
  FileListener.super_.call(this);
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
  this._watch = this._inotify.addWatch({
    path: this._jobsDirectory,
    watch_for: Inotify.IN_CLOSE_WRITE,
    callback: function(event) {
      if (event.name) {
        var filePath = path.join(this._jobsDirectory, event.name);
        this.emit('file', filePath);
      }
    }.bind(this)
  });
};

FileListener.prototype._emitEventsForOutstandingFiles = function() {
  var self = this;
  fs_readdir(this._jobsDirectory).then(function(files) {
    files.map(function(basename) {
      var filePath = path.join(self._jobsDirectory, basename);
      self.emit('file', filePath);
    });
  });
};

module.exports = FileListener;
