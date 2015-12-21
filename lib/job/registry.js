function JobRegistry() {
  this._registry = {};
}

/**
 * @param {String} plugin
 * @param {String} event
 * @returns {function(new:AbstractJob)}
 */
JobRegistry.prototype.getJobClass = function(plugin, event) {
  var jobClass = this._registry[this._getJobKey(plugin, event)];
  if (!jobClass) {
    throw new Error('No Job for plugin: ' + plugin + ', event: ' + event);
  }
  return jobClass;
};

/**
 * @param {function(new:AbstractJob)} jobClass
 */
JobRegistry.prototype.register = function(jobClass) {
  var key = this._getJobKey(jobClass.getPlugin(), jobClass.getEvent());
  this._registry[key] = jobClass;
};

JobRegistry.prototype._getJobKey = function(plugin, event) {
  return plugin + ':' + event;
};

module.exports = JobRegistry;
