var minilog = require('minilog');
var Stream = require('stream');

/**
 * @param {String} name
 * @constructor
 */
function Logger(name) {
  this._name = name;
  this._transform = new minilog.Transform();
  this.debug = this.write.bind(this, 'debug');
  this.info = this.write.bind(this, 'info');
  this.warn = this.write.bind(this, 'warn');
  this.error = this.write.bind(this, 'error');
}

/**
 * @param dest
 * @returns {Transform}
 */
Logger.prototype.pipe = function(dest) {
  if (dest instanceof Stream) {
    return this._transform.pipe(new minilog.Stringifier()).pipe(dest);
  } else {
    return this._transform.pipe(dest);
  }
};

/**
 * @param from
 */
Logger.prototype.unpipe = function(from) {
  this._transform.unpipe(from);
};

/**
 * @param {String} level
 * @param [arg1]
 * @param [arg2]
 */
Logger.prototype.write = function(level, arg1, arg2) {
  var args = Array.prototype.slice.call(arguments, 1);
  this._transform.write(this._name, level, args);
};

Logger.backends = minilog.backends;

module.exports = Logger;

