var minilog = require('minilog');
var fs = require('fs');

/**
 * @param {String} logPath path to a log file.
 */
var Logger = function(logPath) {
  if (!logPath) {
    throw new Error('Trying to create log without config');
  }
  var logFilePath = __dirname + '/../' + logPath;

  minilog
    .pipe(minilog.backends.console)
    .pipe(fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'}));
};

/**
 * @returns {Transform}
 */
Logger.prototype.getLog = function() {
  return minilog('app');
};

module.exports = Logger;
