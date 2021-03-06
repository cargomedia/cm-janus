var Promise = require('bluebird');
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function RtpbroadcastRecordingJob(id, jobData, configuration) {
  if (!_.has(jobData, 'audio')) {
    throw new Error('No `audio` parameter provided');
  }
  if (!_.has(jobData, 'video')) {
    throw new Error('No `video` parameter provided');
  }
  if (!_.has(jobData, 'uid')) {
    throw new Error('No `uid` parameter provided');
  }
  RtpbroadcastRecordingJob.super_.apply(this, arguments);
}

util.inherits(RtpbroadcastRecordingJob, AbstractJob);

RtpbroadcastRecordingJob.getPlugin = function() {
  return 'janus.plugin.cm.rtpbroadcast';
};

RtpbroadcastRecordingJob.getEvent = function() {
  return 'archive-finished';
};

RtpbroadcastRecordingJob.prototype._run = function() {
  var self = this;
  var context = self.getContext();
  var channelUid = this._jobData.uid;
  var audioMjrFile = this._jobData.audio;
  var videoMjrFile = this._jobData.video;

  return this._tmpFilename('webm')
    .then(function(webmFile) {
      return self._audioVideoMerge(audioMjrFile, videoMjrFile, webmFile)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(channelUid, webmFile, context)
        })
        .then(function() {
          return Promise.join(
            unlink(audioMjrFile).catch(function(error) {
              serviceLocator.get('logger').error('Removing audio file failed', context.clone().extend({exception: error}));
            }),
            unlink(videoMjrFile).catch(function(error) {
              serviceLocator.get('logger').error('Removing video file failed', context.clone().extend({exception: error}));
            })
          );
        });
    });
};

RtpbroadcastRecordingJob.prototype._audioVideoMerge = function(audioMjrFile, videoMjrFile, webmFile) {
  var convertCommand = _.template(this._configuration.mergeCommand)({
    audioMjrFile: audioMjrFile,
    videoMjrFile: videoMjrFile,
    webmFile: webmFile
  });
  return this._runJobScript(convertCommand);
};

RtpbroadcastRecordingJob.prototype.getContext = function() {
  var context = RtpbroadcastRecordingJob.super_.prototype.getContext.call(this);
  context.extend({janus: {channelId: this._jobData.uid, jobData: this._jobData}});
  return context;
};

module.exports = RtpbroadcastRecordingJob;
