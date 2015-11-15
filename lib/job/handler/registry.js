function JobHandlerRegistry() {
  this._handlers = {};
}

/**
 * @param {String} plugin
 * @param {String} event
 * @returns {AbstractJobHandler}
 */
JobHandlerRegistry.prototype.getHandler = function(plugin, event) {
  var handler = this._handlers[this._getHandlerKey(plugin, event)];
  if (!handler) {
    throw new Error('No JobHandler for plugin: ' + plugin + ', event: ' + event);
  }
  return handler;
};

/**
 * @param {function(new:AbstractJobHandler)} handlerClass
 */
JobHandlerRegistry.prototype.register = function(handlerClass) {
  var handler = new handlerClass();
  var key = this._getHandlerKey(handler.getPlugin(), handler.getEvent());
  this._handlers[key] = handler;
};

JobHandlerRegistry.prototype._getHandlerKey = function(plugin, event) {
  return plugin + ':' + event;
};

module.exports = JobHandlerRegistry;
