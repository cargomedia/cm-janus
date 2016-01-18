var exec = require('child_process').exec;
var Promise = require('bluebird');
var serviceLocator = require('./service-locator');

/**
 * @param {String} applicationRootPath
 * @constructor
 */
function CmApplication(applicationRootPath) {

  /** @type {String} */
  this.applicationRootPath = applicationRootPath;
}

/**
 * @param {String} channelUid
 * @param {String} thumbnailPath
 * @returns {Promise}
 */
CmApplication.prototype.importVideoStreamThumbnail = function(channelUid, thumbnailPath) {
  return this.runCommand('media-streams', 'import-video-thumbnail', [channelUid, thumbnailPath]);
};

/**
 * @param {String} channelUid
 * @param {String} archiveSource
 * @returns {Promise}
 */
CmApplication.prototype.importMediaStreamArchive = function(channelUid, archiveSource) {
  return this.runCommand('media-streams', 'import-archive', [channelUid, archiveSource]);
};

/**
 * @param {String} packageName
 * @param {String} action
 * @param {Array<String>} [args]
 * @returns {Promise}
 */
CmApplication.prototype.runCommand = function(packageName, action, args) {
  args = args || [];
  var command = ['bin/cm', packageName, action].concat(args).join(' ');
  return new Promise(function(resolve, reject) {

    serviceLocator.get('logger').debug('Running cm command `' + command + '`');
    this._exec(command, {cwd: this.applicationRootPath}, function(error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  }.bind(this));
};

CmApplication.prototype._exec = exec;

module.exports = CmApplication;

