var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var Inotify = require('inotify').Inotify;
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var serviceLocator = require('../service-locator');
var JobRegistry = require('./registry');

var unlink = Promise.promisify(fs.unlink);
Promise.config({cancellation: true});

/**
 * @param {String} jobDirectory, an Absolute one!
 * @param {String} tempFilesDir, an Absolute one!
 * @param {Array} jobWatchList
 * @constructor
 */
function JobManager(jobDirectory, tempFilesDir, jobWatchList) {
  if (!fs.statSync(jobDirectory).isDirectory()) {
    throw new Error('`jobDirectory` must be a directory');
  }
  this._jobDirectory = jobDirectory;
  this._tempFilesDir = tempFilesDir;
  this._inotify = new Inotify();
  this._watch = null;
  this._jobRegistry = null;
  this._activeJobs = {};
  this._setupJobRegistry(jobWatchList);
}

JobManager.prototype.start = function() {
  this._prepareTempFilesDir();
  this._handleExistingJobFiles();
  this._installFileListeners();
  this._activeJobs = {};
};

/**
 * @return {Promise}
 */
JobManager.prototype.stop = function() {
  this._removeFileListeners();

  _.each(this._activeJobs, function(job) {
    job.cancel();
  });

  return new Promise(function(resolve, reject) {
    rimraf(this._tempFilesDir, function(err) {
      if (err) {
        console.log('$$$$$$$$$$$$$$$$$$$$');
        console.error(err);
        serviceLocator.get('logger').error('job handlers temp directory cleanup error');
        reject(err);
      } else {
        resolve();
      }
    });
  }.bind(this));
};

/**
 * @param {String} filepath
 */
JobManager.prototype._handleJobFile = function(filepath) {
  var self = this;
  var job;
  this._readJobFile(filepath)
    .then(function(fileContent) {
      job = self._createJob(fileContent['plugin'], fileContent['event'], fileContent['data']);
      self._addJob(job);
      return job.run(self._tempFilesDir);
    }).then(function() {
      unlink(filepath);
    }).catch(function(error) {
      serviceLocator.get('logger').error(error);
    }).finally(function() {
      if (job) {
        self._removeJob(job.id);
      }
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
 * @param {Array} jobWatchList
 */
JobManager.prototype._setupJobRegistry = function(jobWatchList) {
  this._jobRegistry = new JobRegistry();
  jobWatchList.forEach(function(jobClass) {
    this._jobRegistry.register(jobClass);
  }.bind(this));
};

/**
 * @param {String} plugin
 * @param {String} event
 * @param {Object} data
 */
JobManager.prototype._createJob = function(plugin, event, data) {
  var jobClass = this._jobRegistry.getJobClass(plugin, event, data);
  return new jobClass(data);
};

/**
 * @param {AbstractJob} job
 */
JobManager.prototype._addJob = function(job) {
  this._activeJobs[job.id] = job;
};

/**
 * @param {String} jobId
 */
JobManager.prototype._removeJob = function(jobId) {
  delete this._activeJobs[jobId];
};

JobManager.prototype._prepareTempFilesDir = function() {
  var dir = this._tempFilesDir;
  try {
    rimraf.sync(dir); //could exist after SIGTERM
    mkdirp.sync(dir);
    fs.accessSync(dir, fs.W_OK);
  }
  catch (err) {
    serviceLocator.get('logger').error('job temp directory preparing error');
    throw err;
  }
};

module.exports = JobManager;
