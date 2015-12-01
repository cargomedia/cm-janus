var exec = require('child_process').exec;
var Promise = require('bluebird');

/**
 * @param {String} applicationRootPath
 * @constructor
 */
function CmApplication(applicationRootPath) {

  /** @type {String} */
  this.applicationRootPath = applicationRootPath;
}

/**
 * @param {String} streamChannelId
 * @param {String} thumbnailPath
 * @returns {Promise}
 */
CmApplication.prototype.importVideoStreamThumbnail = function(streamChannelId, thumbnailPath) {
  return this.runCommand('media-streams', 'import-video-thumbnail', [streamChannelId, thumbnailPath]);
};

/**
 * @param {String} streamChannelId
 * @param {String} archiveSource
 * @returns {Promise}
 */
CmApplication.prototype.importMediaStreamArchive = function(streamChannelId, archiveSource) {
  return this.runCommand('media-streams', 'import-archive', [streamChannelId, archiveSource]);
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

