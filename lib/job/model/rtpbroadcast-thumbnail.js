var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function RtpbroadcastThumbnailJob(jobData, configuration) {
  if (!_.has(jobData, 'thumb')) {
    throw new Error('No `thumb` parameter provided');
  }
  if (!_.has(jobData, 'id')) {
    throw new Error('No `id` parameter provided');
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
  var streamChannelId = this._jobData.id;
  var videoMjrFile = this._jobData.thumb;

  return this._tmpFilename('png')
    .then(function(pngFile) {
      return self._extractThumbnail(videoMjrFile, pngFile)
        .then(function() {
          return serviceLocator.get('cm-application').importVideoStreamThumbnail(streamChannelId, pngFile)
        })
        .then(function() {
          var errorHandler = function(error) {
            if (error) {
              serviceLocator.get('logger').error(error);
            }
          };
          unlink(videoMjrFile, errorHandler);
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

module.exports = RtpbroadcastThumbnailJob;
