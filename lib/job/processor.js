var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var rimraf = Promise.promisify(require('rimraf'));
var async = require('async');
var serviceLocator = require('../service-locator');

/**
 * @param {String} workingDirectory
 * @param {Number} [retryDelay]
 * @param {Number} [concurrency]
 * @constructor
 */
function JobProcessor(workingDirectory, retryDelay, concurrency) {
  this._workingDirectory = workingDirectory;
  this._retryDelay = (retryDelay || 60) * 1000;
  this._concurrency = concurrency || 5;
}

JobProcessor.prototype.start = function() {
  this._queue = async.queue(function(job, done) {
    this._process(job).asCallback(done);
  }.bind(this), this._concurrency);
};


/**
 * @returns {Promise}
 */
JobProcessor.prototype.stop = function() {
  return new Promise(function(resolve) {
    this._queue.pause();
    _.each(this._queue.tasks, function(task) {
      var job = task.data;
      job.cancel();
    });
    this._queue.kill();
    resolve();
  }.bind(this));
};


/**
 * @param {AbstractJob} job
 * @returns {Promise}
 */
JobProcessor.prototype.process = function(job) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._queue.push(job, function(err, result) {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  });
};

/**
 * @param {AbstractJob} job
 */
JobProcessor.prototype.processUntilSuccessful = function(job) {
  var self = this;
  return this.process(job).catch(function() {
    serviceLocator.get('logger').warn('Job processing failed. Reattempt.', job.getContext());
    return Promise.delay(self._retryDelay).then(function() {
      return self.processUntilSuccessful(job);
    })
  });
};

/**
 * @param {AbstractJob} job
 * @returns {Promise}
 */
JobProcessor.prototype._process = function(job) {
  var workingDirectory = this._createJobWorkingDirectory(job);
  job.setWorkingDirectory(workingDirectory);
  return job.run()
    .finally(function() {
      return rimraf(workingDirectory);
    });
};

/**
 * @param {AbstractJob} job
 * @throws {Error}
 * @returns {String}
 */
JobProcessor.prototype._createJobWorkingDirectory = function(job) {
  var basename = job.id + '-' + Date.now();
  var dir = path.join(this._workingDirectory, basename);
  try {
    mkdirp.sync(dir);
    fs.accessSync(dir, fs.W_OK);
  }
  catch (error) {
    serviceLocator.get('logger').error('Job working directory could not be created', job.getContext().extend({exception: error}));
    throw error;
  }
  return dir;
};

module.exports = JobProcessor;
