var minilog = require('minilog');
var fs = require('fs');

/**
 * @param {String} logFilePath
 * @param {String} name
 * @constructor
 */
function Logger(logFilePath, name) {
  var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});
  minilog.enable(); //instead of pipe to console
  minilog.pipe(stream);
  this._logger = minilog(name);
}

/**
 * @returns {Transform}
 */
Logger.prototype.getHandler = function() {
  return this._logger;
};

module.exports = Logger;
