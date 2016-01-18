function JobHandler(jobClass, configuration) {
  this.jobClass = jobClass;
  this.configuration = configuration;
}

/**
 * @param {String} id
 * @param {Object} data
 * @returns {AbstractJob}
 */
JobHandler.prototype.instantiateJob = function(id, data) {
  var jobClass = this.jobClass;
  return new jobClass(id, data, this.configuration);
};

module.exports = JobHandler;
