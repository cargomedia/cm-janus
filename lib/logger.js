var isConfigured = false;

var minilog = require('minilog')('app');
var fs = require('fs');

/**
 * @param {String} logPath path to a log file.
 */
module.exports.configure = function(logPath) {
  if (!logPath) {
    throw new Error('Trying to create log without config');
  }
  minilog.pipe(fs.createWriteStream('../' + logPath, {flags: 'w', defaultEncoding: 'utf8'}));
  isConfigured = true;
};

/**
 * @returns {Transform}
 */
module.exports.getLog = function() {
  if (!isConfigured) {
    throw new Error('You must configure log before using it');
  }
  return minilog;
};
