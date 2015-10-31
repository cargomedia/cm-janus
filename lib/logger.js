var minilog = require('minilog');
var fs = require('fs');
var config = require('config');

var isConfigured = false;

/**
 * @param {String} logPath path to a log file.
 */
module.exports.configure = function(logPath) {
  if (!logPath) {
    throw new Error('Trying to create logger without file path');
  }
  var logFilePath = __dirname + '/../' + config.get('app.logPath');
  var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});

  minilog.enable(); //instead of pipe to console
  minilog.pipe(stream);
  isConfigured = true;
};

module.exports.getLogger = function() {
  if (!isConfigured) {
    throw new Error('You must configure logger before using it');
  }
  return minilog('app');
};
