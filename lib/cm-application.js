var exec = require('child_process').exec;
var Promise = require('bluebird');
var serviceLocator = require('./service-locator');
var Context = require('./context');

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
 * @param {Number} createdAt
 * @param {Context} [context]
 * @returns {Promise}
 */
CmApplication.prototype.importVideoStreamThumbnail = function(channelUid, thumbnailPath, createdAt, context) {
  return this.runCommand('media-streams', 'import-video-thumbnail', [channelUid, thumbnailPath, createdAt], context);
};

/**
 * @param {String} channelUid
 * @param {String} archiveSource
 * @param {Context} [context]
 * @returns {Promise}
 */
CmApplication.prototype.importMediaStreamArchive = function(channelUid, archiveSource, context) {
  return this.runCommand('media-streams', 'import-archive', [channelUid, archiveSource], context);
};

/**
 * @param {String} packageName
 * @param {String} action
 * @param {Array<String>} [args]
 * @param {Context} [context]
 * @returns {Promise}
 */
CmApplication.prototype.runCommand = function(packageName, action, args, context) {
  var commandContext = new Context();
  if (context) {
    commandContext.merge(context);
  }
  args = args || [];
  var command = ['bin/cm', packageName, action].concat(args).join(' ');
  commandContext.extend({command: command});
  return new Promise(function(resolve, reject) {
    serviceLocator.get('logger').debug('Running cm command', commandContext);
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

