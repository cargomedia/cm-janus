/**
 * @param {String} tempDir
 * @constructor
 */
function AbstractJobHandler(tempDir) {
  this._tempDir = tempDir;
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

module.exports = AbstractJobHandler;
