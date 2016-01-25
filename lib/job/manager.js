var _ = require('underscore');
var path = require('path');
var Promise = require('bluebird');
var Inotify = require('inotify').Inotify;
var mkdirp = require('mkdirp');
var rimraf = Promise.promisify(require('rimraf'));
var fs = Promise.promisifyAll(require('fs'));
var async = require('async');
var kue = require('kue');

var serviceLocator = require('../service-locator');
var JobHandlerRegistry = require('./handler-registry');
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
  this._failureBackoff = 20000;
  this._jobsDirectory = jobDirectory;
  this._tempFilesDir = tempFilesDir;
  this._inotify = new Inotify();
  this._watch = null;

  this.handlerRegistry = new JobHandlerRegistry();
  if (handlers) {
    handlers.forEach(function(handler) {
      this.handlerRegistry.register(handler);
    }.bind(this));
  }
  this._queue = kue.createQueue();
}

JobManager.prototype.start = function() {
  this._loadExistingJobFiles();
  this._installFileListeners();

  this._queue.process('janus-job', 5, function(jobData, done) {
    this.processJob(jobData).asCallback(done);
  }.bind(this));
};

/**
 * @return {Promise}
 */
JobManager.prototype.stop = function() {
  return new Promise(function(resolve, reject) {
    this._removeFileListeners();
    this._queue.shutdown(5000, function(err) {
      if (err) {
        reject(err);
      }
      resolve();
    });
  }.bind(this));
};

JobManager.prototype.queueJob = function(jobData) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var job = self._queue.create('janus-job', jobData);
    job.on('complete', function(result) {
      resolve(result);
    });
    job.on('failed', function(error) {
      reject(error);
    });
    job.save();
  });
};

/**
 * @param {Object} jobData
 * @returns {Promise}
 */
JobManager.prototype.processJob = function(jobData) {
  var jobId = jobData['id'];
  var jobDescription = jobData['description'];
  var handler = this.handlerRegistry.get(jobDescription['plugin'], jobDescription['event']);
  var workingDirectory = this._createWorkingDirectory(jobId);
  var job = handler.instantiateJob(jobId, jobDescription['data']);
  job.setWorkingDirectory(workingDirectory);
  return job.run()
    .then(function() {
      return rimraf(workingDirectory);
    });
};

/**
 * @param {String} jobId
 * @throws {Error}
 * @returns {String}
 */
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

JobManager.prototype._loadExistingJobFiles = function() {
  var self = this;
  fs.readdir(this._jobsDirectory).then(function(files) {
    files.forEach(function(filename) {
      var filepath = path.join(self._jobsDirectory, filename);
      self._handleJobFile(filepath);
    });
  });
};

/**
 * @param {String} filepath
 * @returns {Promise}
 */
JobManager.prototype._handleJobFile = function(filepath) {
  var manager = this;
  manager._readJobFile(filepath)
    .then(function(jobDescription) {
      return manager.queueJob({
        id: path.basename(filepath, '.json'),
        description: jobDescription
      });
    })
    .then(function() {
      serviceLocator.get('logger').info('Removing ' + filepath);
      return fs.unlink(filepath);
    })
    .catch(function(error) {
      var logMessage = error.stack || error.message || error;
      serviceLocator.get('logger').error(logMessage);
    });
};

/**
 * @param {String} filepath
 * @returns {Promise}
 */
JobManager.prototype._readJobFile = function(filepath) {
  return fs.readFile(filepath)
    .then(function(content) {
      return Promise.try(function() {
        return JSON.parse(content);
      });
    })
    .catch(function(error) {
      throw new Error('Invalid job file: ' + error.message)
    });
};

JobManager.prototype._installFileListeners = function() {
  this._watch = this._inotify.addWatch({
    path: this._jobsDirectory,
    watch_for: Inotify.IN_CLOSE_WRITE,
    callback: function(event) {
      if (event.name) {
        this._handleJobFile(path.join(this._jobsDirectory, event.name));
      }
    }.bind(this)
  });
};

JobManager.prototype._removeFileListeners = function() {
  this._inotify.removeWatch(this._watch);
};

module.exports = JobManager;
