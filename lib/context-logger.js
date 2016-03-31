var serviceLocator = require('./service-locator');

/**
 * @param {Object} [logContext]
 * @constructor
 */
function ContextLogger(logContext) {
  this.setContext(logContext);
}

ContextLogger.prototype.setContext = function(logContext) {
  this._context = logContext;
};

ContextLogger.prototype.getContext = function() {
  return this._context;
};


['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(level) {
  ContextLogger.prototype[level] = function(message) {
    serviceLocator.get('logger')[level](message, this.getContext());
  }
});

module.exports = ContextLogger;
