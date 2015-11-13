var TestJobHandler = require('./test');

var handlers = {};

[TestJobHandler].forEach(function(handlerClass) {
  var handler = new handlerClass();
  var key = getHandlerKey(handler.getPlugin(), handler.getEvent());
  handlers[key] = handler;
}.bind(this));

function getHandlerKey(plugin, event) {
  return plugin + ':' + event;
}

function JobHandlerRegistry() {
}

JobHandlerRegistry.getHandler = function(plugin, event) {
  var handler = handlers[getHandlerKey(plugin, event)];
  if (!handler) {
    throw new Error('No JobHandler for plugin: ' + plugin + ', event: ' + event);
  }
  return handler;
};

module.exports = JobHandlerRegistry;
