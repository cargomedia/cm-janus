var _ = require('underscore');
var JobHandler = require('./handler');

function JobHandlerRegistry() {
  this.list = [];
}

/**
 * @param {String} plugin
 * @param {String} event
 * @returns {JobHandler}
 */
JobHandlerRegistry.prototype.get = function(plugin, event) {
  var handler = _.find(this.list, function(handler) {
    return handler.jobClass.getPlugin() === plugin && handler.jobClass.getEvent() === event;
  });
  if (!handler) {
    throw new Error('No handler found for `' + plugin + '`, `' + event + '`');
  }
  return handler;
};

/**
 * @param {JobHandler} handler
 */
JobHandlerRegistry.prototype.register = function(handler) {
  this.list.push(handler)
};

/**
 * @param {Object} handlersConfiguration
 */
JobHandlerRegistry.prototype.registerFromConfiguration = function(handlersConfiguration) {
  _.each(handlersConfiguration, function(handlerConfiguration, key) {
    var jobClass = _.find(JobHandlerRegistry.availableJobs, function(jobClass) {
      var jobKey = jobClass.getPlugin() + ':' + jobClass.getEvent();
      return jobKey === key;
    });

    if (!jobClass) {
      throw new Error('Invalid job class key: `' + key + '`');
    }

    var handler = new JobHandler(jobClass, handlerConfiguration);
    this.register(handler);
  }.bind(this));
};

JobHandlerRegistry.availableJobs = [
  require('./model/audioroom-recording'),
  require('./model/rtpbroadcast-recording'),
  require('./model/rtpbroadcast-thumbnail')
];

module.exports = JobHandlerRegistry;
