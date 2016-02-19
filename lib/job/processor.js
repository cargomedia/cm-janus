var Promise = require('bluebird');
var kue = require('kue');
var serviceLocator = require('../service-locator');

/**
 * @param {String} workingDirectory
 * @constructor
 */
function JobProcessor(workingDirectory) {
  this._workingDirectory = workingDirectory;
  this._queue = kue.createQueue();
}


/**
 * @returns {Promise}
 */
JobProcessor.prototype.start = function() {
  this._queue.process('janus-job', 5, function(job, done) {
    this._process(job).asCallback(done);
  }.bind(this));
  return Promise.resolve();
};


/**
 * @returns {Promise}
 */
JobProcessor.prototype.stop = function() {
  return new Promise(function(resolve, reject) {
    this._queue.shutdown(5000, function(err) {
      if (err) {
        reject(err);
      }
      resolve();
    });
  }.bind(this));
};


/**
 * @param {AbstractJob} job
 * @returns {Promise}
 */
JobProcessor.prototype.process = function(job) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var job = self._queue.create('janus-job', job);
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
 * @param {AbstractJob} job
 */
JobProcessor.prototype.processUntilSuccessful = function(job) {
  return this.process(job).catch(function(error) {
    serviceLocator.get('logger').info(error);
    return this.processUntilSuccessful(job);
  }.bind(this));
};

/**
 * @param {AbstractJob} job
 * @returns {Promise}
 */
JobProcessor.prototype._process = function(job) {
  var workingDirectory = this._createJobWorkingDirectory(job);
  job.setWorkingDirectory(workingDirectory);
  return job.run()
    .then(function() {
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
  catch (err) {
    serviceLocator.get('logger').error('Job working directory could not be created');
    throw err;
  }
  return dir;
};

module.exports = JobProcessor;
