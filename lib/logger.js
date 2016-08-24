var logLevels = require('log4js').levels;

function Logger(log4js) {
  this.log4js = log4js;
}

/**
 * @param {String} level
 * @param {String} message
 * @param {Context} [context]
 * @private
 */
Logger.prototype._log = function(level, message, context) {
  var fields = context ? context.toHash() : {};
  this.log4js.log(level, message, fields);
};


['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(level) {
  Logger.prototype[level] = function(message, extra) {
    this._log(logLevels[level.toUpperCase()], message, extra);
  };
});

module.exports = Logger;
