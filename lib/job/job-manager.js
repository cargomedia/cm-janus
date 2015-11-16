var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var Inotify = require('inotify').Inotify;

var serviceLocator = require('../service-locator');
var logger = serviceLocator.get('logger');
var JobHandlerRegistry = require('./handler/registry');

/**
 * @param {String} jobDirectory, an Absolute one!
 * @param {Array} jobHandlerList
 * @constructor
 */
function JobManager(jobDirectory, jobHandlerList) {
  if (!fs.statSync(jobDirectory).isDirectory()) {
    throw new Error('`jobDirectory` must be a directory');
  }
  this._jobDirectory = jobDirectory;
  this._inotify = new Inotify();
  this._watch = null;
  this._jobHandlerRegistry = null;

  this._setupJobHandlers(jobHandlerList);
  this._handleExistingJobFiles();
  this._installFileListeners();
}

JobManager.prototype.reset = function() {
  this._removeFileListeners();
  this._installFileListeners();
};

/**
 * @param {String} filepath
 */
JobManager.prototype._handleJobFile = function(filepath) {
  this._readJobFile(filepath)
    .then(function(job) {
      var handler = this._jobHandlerRegistry.getHandler(job['plugin'], job['event']);
      return new Promise(function(resolve, reject) {
        handler.handle(job['data']).then(function() {
          fs.unlink(filepath, function(err) {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        })
      });
    }.bind(this))
    .catch(function(error) {
      logger.error(error);
    });
};

JobManager.prototype._handleExistingJobFiles = function() {
  var self = this;
  fs.readdir(this._jobDirectory, function(error, files) {
    if (error) {
      throw error;
    }
    files.forEach(function(filename) {
      self._handleJobFile(path.join(self._jobDirectory, filename));
    });
  });
};

/**
 * @param filepath
 * @returns {Promise}
 */
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
      if (!job || !job['plugin'] || !job['event'] || !job['data']) {
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
      if (event.name) {
        this._handleJobFile(path.join(this._jobDirectory, event.name));
      }
    }.bind(this)
  });
};

JobManager.prototype._removeFileListeners = function() {
  this._inotify.removeWatch(this._watch);
};

/**
 * @param {Array} jobHandlerList
 */
JobManager.prototype._setupJobHandlers = function(jobHandlerList) {
  this._jobHandlerRegistry = new JobHandlerRegistry();
  jobHandlerList.forEach(function(handler) {
    this._jobHandlerRegistry.register(handler);
  }.bind(this));
};

module.exports = JobManager;
