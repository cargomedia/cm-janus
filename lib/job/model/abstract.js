var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var rimraf = require('rimraf');
var serviceLocator = require('../../service-locator');

/**
 * @param {String} id
 * @param {Object} jobData
 * @param {Object} configuration
 * @constructor
 */
function AbstractJob(id, jobData, configuration) {

  /** @type {String} */
  this.id = id;

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
 * @returns {String}
 */
AbstractJob.prototype.getName = function() {
  return this.constructor.getPlugin() + ':' + this.constructor.getEvent();
};

AbstractJob.prototype.toString = function() {
  return 'Job' + JSON.stringify({id: this.id, name: this.getName(), workingDirectory: this._workingDirectory});
};

/**
 * @param {String} workingDirectory
 */
AbstractJob.prototype.setWorkingDirectory = function(workingDirectory) {
  this._workingDirectory = workingDirectory;
};

/**
 * @returns {String} workingDirectory
 */
AbstractJob.prototype.getWorkingDirectory = function() {
  if (null === this._workingDirectory) {
    throw new Error('Working directory not set');
  }
  return this._workingDirectory;
};

/**
 * @returns {Promise}
 */
AbstractJob.prototype.run = function() {
  this._promise = this._run();
  return this._promise;
};
/**
 * @returns {Promise}
 */
AbstractJob.prototype._run = function() {
  throw new Error('Not Implemented');
};

AbstractJob.prototype.cancel = function() {
  if (this._promise && this._promise.isPending()) {
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
    rimraf.sync(this._workingDirectory);
  }
};

/**
 * @param {String} commandText
 * @returns {Promise}
 */
AbstractJob.prototype._runJobScript = function(commandText) {
  var command = commandText;
  var commandArgs = [];
  if (commandText.indexOf(' ') >= 0) {
    var commandParts = commandText.split(' ');
    command = commandParts.shift();
    commandArgs = commandParts;
  }
  var self = this;
  return new Promise(function(resolve, reject) {
    var options = {
      cwd: self.getWorkingDirectory()
    };
    serviceLocator.get('logger').debug('Starting job process: `' + commandText + '`');
    var output = '';
    self._process = self._spawn(command, commandArgs, options);
    self._process.stdout.on('data', function(data) {
      output += data;
    });
    self._process.on('close', function(code) {
      self._process = null;
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error('Failed job process: `' + commandText + '` + code: ' + code));
      }
    });
  });
};

/**
 * @param {String} extension
 * @returns {Promise}
 */
AbstractJob.prototype._tmpFilename = function(extension) {
  var options = {dir: this.getWorkingDirectory()};
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

AbstractJob.prototype._spawn = spawn;

module.exports = AbstractJob;
