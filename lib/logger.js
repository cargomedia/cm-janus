var _ = require('underscore');
var logLevels = require('log4js').levels;
var Context = require('./context');

function Logger(log4js) {
  this.log4js = log4js;
}

/**
 * @param {String} level
 * @param {String} message
 * @param {Context|Object} extra
 * @private
 */
Logger.prototype._log = function(level, message, extra) {
  if (extra instanceof Context) {
    extra = extra.toHash();
  }
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
