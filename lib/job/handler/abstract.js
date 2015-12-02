var fs = require('fs');

/**
 * @constructor
 */
function AbstractJobHandler() {
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

module.exports = AbstractJobHandler;
