var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var tmpName = Promise.promisify(require('tmp').tmpName);
var rimraf = require('rimraf');

/**
 * @param {Object} jobData
 * @param {String} configuration
 * @constructor
 */
function AbstractJob(jobData, configuration) {

  /** @type {String} */
  this.id = uuid.v4();

  /** @type {Object} */
  this._jobData = jobData;

  /** @type {Object} */
  this._configuration = configuration;

  /** @type {Promise} */
  this._promise = null;

  /** @type {ChildProcess} */
  this._process = null;

  /** @type {String|null} */
  this._workingDirectory = null;
}

/**
 * @param {String} workingDirectory
 */
AbstractJob.prototype.setWorkingDirectory = function(workingDirectory) {
  this._workingDirectory = workingDirectory;
};

/**
 * @param {String} tmpDir
 * @returns {Promise}
 */
AbstractJob.prototype.run = function() {
  this._promise = this._run();
  return this._promise;
};
/**
 * @param {String} tmpDir
 * @returns {Promise}
 */
AbstractJob.prototype._run = function() {
  throw new Error('Not Implemented');
};

AbstractJob.prototype.cancel = function() {
  if (this.promise && this._promise.isPending()) {
    this._promise.cancel();
    this._promise = null;
  }
  this.cleanup();
};

AbstractJob.prototype.cleanup = function() {
  if (this._process) {
    this._process.kill('SIGKILL');
    this._process = null;
  }
  if (this._workingDirectory) {
    rimraf.sync(job._workingDirectory);
  }
};

/**
 * @param {String} scriptFile
 * @param {Array} scriptArgs
 * @returns {Promise}
 */
AbstractJob.prototype._runJobScript = function(scriptFile, scriptArgs) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._process = self._exec([scriptFile].concat(scriptArgs).join(' '), function(error) {
      self._process = null;
      if (null === error) {
        resolve();
      } else {
        reject(error);
      }
    })
  }.bind(this));
};

/**
 * @param {String} extension
 * @returns {Promise}
 */
AbstractJob.prototype._tmpFilename = function(extension) {
  if (!this._workingDirectory) {
    throw new Error('Working directory not set');
  }

  var options = {dir: this._workingDirectory};
  if (extension) {
    options['postfix'] = '.' + extension;
  }
  return tmpName(options);
};

/**
 * @returns {String}
 */
AbstractJob.getPlugin = function() {
  throw new Error('Not Implemented');
};

/**
 * @returns {String}
 */
AbstractJob.getEvent = function() {
  throw new Error('Not Implemented');
};

AbstractJob.prototype._exec = exec;

module.exports = AbstractJob;
