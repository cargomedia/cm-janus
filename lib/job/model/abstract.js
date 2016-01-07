var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var uuid = require('node-uuid');

/**
 * @param {Object} jobData
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
}

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

/**
 * @param {String} tmpDir
 * @returns {Promise}
 */
AbstractJob.prototype.run = function(tmpDir) {
  this._promise = this._run(tmpDir);
  return this._promise;
};
/**
 * @param {String} tmpDir
 * @returns {Promise}
 */
AbstractJob.prototype._run = function(tmpDir) {
  throw new Error('Not Implemented');
};

AbstractJob.prototype.cancel = function() {
  if (this._promise && this._promise.isPending()) {
    this._promise.cancel();
    this._promise = null;
  }
  if (this._process) {
    this._process.kill('SIGKILL');
    this._process = null;
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

AbstractJob.prototype._exec = exec;

module.exports = AbstractJob;
