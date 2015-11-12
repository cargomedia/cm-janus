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
 * @param {String} msg
 */
Logger.prototype.debug = function(msg) {
  this._logger.debug(msg);
};

/**
 * @param {String} msg
 */
Logger.prototype.error = function(msg) {
  this._logger.error(msg);
};

/**
 * @param {String} msg
 */
Logger.prototype.warn = function(msg) {
  this._logger.warn(msg);
};

/**
 * @param {String} msg
 */
Logger.prototype.info = function(msg) {
  this._logger.info(msg);
};

module.exports = Logger;
