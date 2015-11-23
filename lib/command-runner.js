var spawn = require('child_process').spawn;

/**
 * @constructor
 */
function CommandRunner() {
}

/**
 * @param {String} command
 * @param {Array<String>} args
 * @param {Object} options
 * @returns {Promise}
 */
CommandRunner.prototype.execute = function(command, args, options) {
  return new Promise(function(resolve, reject) {
    var command = [command].concat(args).join(' ');
    var ps = spawn(command, options);

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
