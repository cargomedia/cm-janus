function JobHandler(jobClass, configuration) {
  this.jobClass = jobClass;
  this.configuration = configuration;
}

/**
 * @param {Object} data
 * @returns {AbstractJob}
 */
JobHandler.prototype.instantiateJob = function(data) {
  var jobClass = this.jobClass;
  return new jobClass(data, this.configuration);
};

module.exports = JobHandler;
