var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var Inotify = require('inotify').Inotify;

var serviceLocator = require('../service-locator');
var logger = serviceLocator.get('logger');
var JobHandlerRegistry = require('./handler/registry');

/**
 * @param {String} jobDirectory, an Absolute one!
 * @constructor
 */
function JobManager(jobDirectory) {
  if (!fs.statSync(jobDirectory).isDirectory()) {
    throw new Error('`jobDirectory` must be a directory');
  }
  this._jobDirectory = jobDirectory;
  this._inotify = new Inotify();
  this._watch = null;
  this._installFileListeners();
}

JobManager.prototype.reset = function() {
  this._removeFileListeners();
  this._installFileListeners();
};

JobManager.prototype._handleJobFile = function(filepath) {
  this._readJobFile(filepath)
    .then(function(job) {
      var handler = JobHandlerRegistry.getHandler(job['plugin'], job['event']);
      handler.handle(job['data']);
    }.bind(this))
    .catch(function(error) {
      logger.error(error);
    });
};

JobManager.prototype._readJobFile = function(filepath) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filepath, function(error, content) {
      if (error) {
        reject(new Error('Invalid file "' + filepath + "'. " + error.message));
      }
      try {
        var job = JSON.parse(content);
      } catch (e) {
        reject(new Error('Invalid file content "' + filepath + "'. " + e.message));
      }
      if (!job['plugin'] || !job['event'] || !job['data']) {
        reject(new Error('"plugin", "event", "data" are required job file fields'));
      }
      resolve(job);
    });
  });
};

JobManager.prototype._installFileListeners = function() {
  this._watch = this._inotify.addWatch({
    path: this._jobDirectory,
    watch_for: Inotify.IN_CLOSE_WRITE,
    callback: function(event) {
      this._handleJobFile(path.join(this._jobDirectory, event.name));
    }.bind(this)
  });
};

JobManager.prototype._removeFileListeners = function() {
  this._inotify.removeWatch(this._watch);
};

module.exports = JobManager;
