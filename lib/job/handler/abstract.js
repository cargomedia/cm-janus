var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

/**
 * @constructor
 */
function AbstractJobHandler() {
  this._tempDir = '';
}

/**
 * @returns {String}
 */
AbstractJobHandler.prototype.getPlugin = function() {
  throw new Error('Not Implemented');
};

/**
 * @returns {String}
 */
AbstractJobHandler.prototype.getEvent = function() {
  throw new Error('Not Implemented');
};

/**
 * @param {Object} jobData
 * @returns {Promise}
 */
AbstractJobHandler.prototype.handle = function(jobData) {
  throw new Error('Not Implemented');
};

/**
 * @param {String} tempDir
 */
AbstractJobHandler.prototype.setTempDir = function(tempDir) {
  this._tempDir = tempDir;
};

/**
 * @returns {String}
 */
AbstractJobHandler.prototype.getTempDir = function() {
  return this._tempDir;
};

/**
 * @param {String} scriptFile
 * @param {Array} scriptArgs
 * @returns {Promise}
 */
AbstractJobHandler.prototype._runJobScript = function(scriptFile, scriptArgs) {
  var self = this;
  var shellScript = path.join(__dirname, '/../../../bin/', scriptFile);
  return new Promise(function(resolve, reject) {
    self._exec([shellScript].concat(scriptArgs).join(' '), function(error) {
      if (null === error) {
        resolve();
      } else {
        reject(error);
      }
    })
  }.bind(this));
};

AbstractJobHandler.prototype._exec = exec;

module.exports = AbstractJobHandler;
