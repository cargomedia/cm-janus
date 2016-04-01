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

['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(level) {
  ContextLogger.prototype[level] = function(message, extra) {
    extra.context = this._context;
    serviceLocator.get('logger')[level](message, extra);
  }
});

module.exports = ContextLogger;
