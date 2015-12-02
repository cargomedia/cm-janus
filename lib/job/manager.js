var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var Inotify = require('inotify').Inotify;
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var uuid = require('node-uuid');

var serviceLocator = require('../service-locator');
var JobHandlerRegistry = require('./handler-registry');

var unlink = Promise.promisify(fs.unlink);
Promise.config({cancellation: true});

/**
 * @param {String} jobDirectory, an Absolute one!
 * @param {String} tempFilesDirectory, an Absolute one!
 * @param {Array} jobHandlerList
 * @constructor
 */
function JobManager(jobDirectory, tempFilesDirectory, jobHandlerList) {
  if (!fs.statSync(jobDirectory).isDirectory()) {
    throw new Error('`jobDirectory` must be a directory');
  }
  this._jobDirectory = jobDirectory;
  this._tempFilesDirectory = tempFilesDirectory;
  this._inotify = new Inotify();
  this._watch = null;
  this._jobHandlerRegistry = null;
  this._activeJobs = {};
  this._setupJobHandlers(jobHandlerList);
}

JobManager.prototype.start = function() {
  this._prepareTempFilesDir(this._tempFilesDirectory);
  this._handleExistingJobFiles();
  this._installFileListeners();
  this._activeJobs = {};
};

/**
 * @return {Promise}
 */
JobManager.prototype.stop = function() {
  this._removeFileListeners();

  _.each(this._activeJobs, function(jobPromise) {
    jobPromise.cancel();
  });

  try {
    rimraf.sync(this._tempFilesDirectory);
  } catch (err) {
    serviceLocator.get('logger').error('job handlers temp directory cleanup error');
  }

  return Promise.resolve();
};

/**
 * @param {String} filepath
 */
JobManager.prototype._handleJobFile = function(filepath) {
  var self = this;

  var jobPromise = this._readJobFile(filepath)
    .then(function(job) {
      var handler = self._jobHandlerRegistry.getHandler(job['plugin'], job['event']);
      return handler.handle(job['data']);
    });

  var jobId = uuid.v4();
  this._activeJobs[jobId] = jobPromise;

  jobPromise.then(function() {
    unlink(filepath);
  }).catch(function(error) {
    serviceLocator.get('logger').error(error);
  }).finally(function() {
    delete self._activeJobs[jobId];
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
    handler.setTempDir(this._tempFilesDirectory);
    this._jobHandlerRegistry.register(handler);
  }.bind(this));
};

JobManager.prototype._prepareTempFilesDir = function(dir) {
  try {
    rimraf.sync(dir); //could exist after SIGTERM
    mkdirp.sync(dir);
    fs.accessSync(dir, fs.W_OK);
  }
  catch (err) {
    serviceLocator.get('logger').error('job handlers temp directory preparing error');
    throw err;
  }
};

module.exports = JobManager;
