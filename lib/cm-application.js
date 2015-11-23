var CommandRunner = require = ('./command-runner');

/**
 * @param {String} applicationRootPath
 * @param {CommandRunner} commandRunner
 * @constructor
 */
function CmApplication(applicationRootPath, commandRunner) {

  /** @type {String} */
  this.applicationRootPath = applicationRootPath;

  /** @type {CommandRunner} */
  this.commandRunner = commandRunner;
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
 * @param {Array<String>} args
 * @returns {Promise}
 */
CmApplication.prototype.runCommand = function(packageName, action, args) {
  return this.commandRunner.execute('bin/cm', [packageName, action].concat(args), {cwd: this.applicationRootPath});
};

