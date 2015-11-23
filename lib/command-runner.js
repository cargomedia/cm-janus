var spawn = require('child_process').spawn;

/**
 * @param {Object} options`
 * @constructor
 */
function CommandRunner(options) {
  this.options = options;
}

/**
 * @param {String} command
 * @param {Array<String>} args
 * @returns {Promise}
 */
CommandRunner.prototype.execute = function(command, args) {
  return new Promise(function(resolve, reject) {
    var command = [command].concat(args).join(' ');
    var ps = spawn(command, this.options);

    var output = '';
    ps.stdout.on('data', function(data) {
      output += data;
    });

    ps.stderr.on('data', function(data) {
      output += data;
    });

    ps.on('close', function(code) {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error('Command `' + command + '` failed with exit code `' + code + '`'));
      }
    });
  });
};

module.exports = CommandRunner;
