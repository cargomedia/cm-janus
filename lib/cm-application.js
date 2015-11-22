var exec = require('child_process').exec;

/**
 * @param {String} applicationDirectory
 * @constructor
 */
function CMApplication(applicationDirectory) {
  this.applicationDirectory = applicationDirectory;
}

/**
 * @param {String} packageName
 * @param {String} action
 * @param {Array} args
 * @returns {Promise}
 */
CMApplication.prototype.exec = function(packageName, action, args) {
  return new Promise(function(resolve, reject) {
    var command = ['bin/cm', packageName, action];
    command.concat(args);

    exec(command.join(' '), {cwd: this.applicationDirectory}, function(error, stdout, stderr) {
      if (error === null) {
        resolve(stdout, stderr);
      } else {
        reject(error);
      }
    });
  });
};

module.exports = CMApplication;
