var Promise = require('bluebird');
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function RtpbroadcastThumbnailJob(id, jobData, configuration) {
  if (!_.has(jobData, 'thumb')) {
    throw new Error('No `thumb` parameter provided');
  }
  if (!_.has(jobData, 'uid')) {
    throw new Error('No `uid` parameter provided');
  }
  if (!_.has(jobData, 'createdAt')) {
    throw new Error('No `createdAt` parameter provided');
  }
  RtpbroadcastThumbnailJob.super_.apply(this, arguments);
}

util.inherits(RtpbroadcastThumbnailJob, AbstractJob);

RtpbroadcastThumbnailJob.getPlugin = function() {
  return 'janus.plugin.cm.rtpbroadcast';
};

RtpbroadcastThumbnailJob.getEvent = function() {
  return 'thumbnailing-finished';
};

RtpbroadcastThumbnailJob.prototype._run = function() {
  var self = this;
  var context = self.getContext();
  var channelUid = this._jobData.uid;
  var videoMjrFile = this._jobData.thumb;
  var createdAt = this._jobData.createdAt;

  return this._tmpFilename('png')
    .then(function(pngFile) {
      return self._extractThumbnail(videoMjrFile, pngFile)
        .then(function() {
          return serviceLocator.get('cm-application').importVideoStreamThumbnail(channelUid, pngFile, createdAt, context)
        })
        .then(function() {
          return unlink(videoMjrFile).catch(function(error) {
            serviceLocator.get('logger').error('Removing thumbnail video file failed', context.clone().extend({exception: error}));
          });
        });
    });
};

RtpbroadcastThumbnailJob.prototype._extractThumbnail = function(videoMjrFile, pngFile) {
  var convertCommand = _.template(this._configuration.createThumbnailCommand)({
    videoMjrFile: videoMjrFile,
    pngFile: pngFile
  });
  return this._runJobScript(convertCommand);
};

RtpbroadcastThumbnailJob.prototype.getContext = function() {
  var context = RtpbroadcastThumbnailJob.super_.prototype.getContext.call(this);
  context.extend({janus: {channelId: this._jobData.uid, jobData: this._jobData}});
  return context;
};

module.exports = RtpbroadcastThumbnailJob;
