var isConfigured = false;

var minilog = require('minilog');
var fs = require('fs');

/**
 * @param {String} logPath path to a log file.
 */
module.exports.configure = function(logPath) {
  minilog.enable();
  if (!logPath) {
    throw new Error('Trying to create log without config');
  }
  var logFilePath = __dirname + '/../' + logPath;
  fs.openSync(logFilePath, 'a');
  minilog.pipe(fs.createWriteStream(logFilePath, {flags: 'w', defaultEncoding: 'utf8'}));
  isConfigured = true;
};

/**
 * @returns {Transform}
 */
module.exports.getLog = function() {
  if (!isConfigured) {
    throw new Error('You must configure log before using it');
  }
  return minilog('app');
};
