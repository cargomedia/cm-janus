var spawnSync = require('child_process').spawnSync;

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
 */
CmApplication.prototype.importVideoStreamThumbnail = function(streamChannelId, thumbnailPath) {
  this.runCommand('media-streams', 'import-video-thumbnail', [streamChannelId, thumbnailPath]);
};

/**
 * @param {String} streamChannelId
 * @param {String} archiveSource
 */
CmApplication.prototype.importMediaStreamArchive = function(streamChannelId, archiveSource) {
  this.runCommand('media-streams', 'import-archive', [streamChannelId, archiveSource]);
};

/**
 * @param {String} packageName
 * @param {String} action
 * @param {Array<String>} args
 * @returns {String}
 */
CmApplication.prototype.runCommand = function(packageName, action, args) {
  var result = this._spawnSync('bin/cm', [packageName, action].concat(args), {cwd: this.applicationRootPath});
  if (result.error) {
    throw result.error;
  }
  return result.output;
};

CmApplication.prototype._spawnSync = spawnSync;

module.exports = CmApplication;

