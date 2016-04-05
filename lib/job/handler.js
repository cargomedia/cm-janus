function JobHandler(jobClass, configuration) {
  this.jobClass = jobClass;
  this.configuration = configuration;
}

/**
 * @param {String} id
 * @param {Object} data
 * @param {Context} [context]
 * @returns {AbstractJob}
 */
JobHandler.prototype.instantiateJob = function(id, data, context) {
  var jobClass = this.jobClass;
  return new jobClass(id, data, this.configuration, context);
};

module.exports = JobHandler;
