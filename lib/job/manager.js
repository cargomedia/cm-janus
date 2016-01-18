var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var Inotify = require('inotify').Inotify;
var mkdirp = require('mkdirp');

var serviceLocator = require('../service-locator');
var JobHandler = require('./handler');
var JobHandlerRegistry = require('./handler-registry');

var unlink = Promise.promisify(fs.unlink);
Promise.config({cancellation: true});

/**
 * @param {String} jobDirectory, an Absolute one!
 * @param {String} tempFilesDir, an Absolute one!
 * @param {Array} handlers
 * @constructor
 */
function JobManager(jobDirectory, tempFilesDir, handlers) {
  if (!fs.statSync(jobDirectory).isDirectory()) {
    throw new Error('`jobDirectory` must be a directory');
  }
  this._jobDirectory = jobDirectory;
  this._tempFilesDir = tempFilesDir;
  this._inotify = new Inotify();
  this._watch = null;
  this._activeJobs = {};

  this.handlerRegistry = new JobHandlerRegistry();
  if (handlers) {
    handlers.forEach(function(handler) {
      this.handlerRegistry.register(handler);
    }.bind(this));
  }
}

JobManager.prototype.start = function() {
  this._handleExistingJobFiles();
  this._installFileListeners();
};

/**
 * @return {Promise}
 */
JobManager.prototype.stop = function() {
  this._removeFileListeners();

  _.each(this._activeJobs, function(job) {
    this.stopJob(job);
  }.bind(this));

  return Promise.resolve();
};

JobManager.prototype._handleExistingJobFiles = function() {
  var self = this;
  fs.readdir(this._jobDirectory, function(error, files) {
    if (error) {
      throw error;
    }
    console.log(files);
    files.forEach(function(filename) {
      self._handleJobFile(path.join(self._jobDirectory, filename));
    });
  });
};

JobManager.prototype._createWorkingDirectory = function(jobId) {
  var basename = jobId + '-' + Date.now();
  var dir = path.join(this._tempFilesDir, basename);
  try {
    mkdirp.sync(dir);
    fs.accessSync(dir, fs.W_OK);
  }
  catch (err) {
    serviceLocator.get('logger').error('Job working directory could not be created');
    throw err;
  }
  return dir;
};

/**
 * @param {String} filepath
 */
JobManager.prototype._handleJobFile = function(filepath) {
  var self = this;
  var job;
  return this._readJobFile(filepath)
    .then(function(fileContent) {
      var handler = self.handlerRegistry.get(fileContent['plugin'], fileContent['event']);
      var jobId = path.basename(filepath, '.json');
      var workingDirectory = self._createWorkingDirectory(jobId);
      job = handler.instantiateJob(jobId, fileContent['data']);
      job.setWorkingDirectory(workingDirectory);
      serviceLocator.get('logger').info('Processing ' + job);
      return self.processJob(job)
    })
    .then(function() {
      serviceLocator.get('logger').info('Removing ' + filepath);
      unlink(filepath);
    })
    .catch(function(error) {
      var logMessage = error.stack || error.message || error;
      serviceLocator.get('logger').error(logMessage);
    });
};

/**
 * @param {AbstractJob} job
 * @returns {Promise}
 */
JobManager.prototype.processJob = function(job) {
  this._addJob(job);
  return job.run()
    .then(function() {
      job.cleanup();
    })
    .finally(function() {
      if (job) {
        this._removeJob(job);
      }
    }.bind(this));
};

/**
 * @param {AbstractJob} job
 */
JobManager.prototype.stopJob = function(job) {
  job.cancel();
  this._removeJob(job.id);
};

/**
 * @param {AbstractJob} job
 */
JobManager.prototype._addJob = function(job) {
  this._activeJobs[job.id] = job;
};

/**
 * @param {AbstractJob} job
 */
JobManager.prototype._removeJob = function(job) {
  delete this._activeJobs[job.id];
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

module.exports = JobManager;
