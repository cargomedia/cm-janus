var _ = require('underscore');
var logLevels = require('log4js').levels;

function Logger(log4js) {
  this.log4js = log4js;
}

Logger.prototype._log = function(level, message, extra) {
  var fields = _.extend({}, extra);
  if (message instanceof Error) {
    var error = message;
    message = error.message;
    fields.error = error;
  }
  this.log4js.log(level, message, fields);
};


['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(level) {
  Logger.prototype[level] = function(message, extra) {
    this._log(logLevels[level.toUpperCase()], message, extra);
  };
});

module.exports = Logger;
