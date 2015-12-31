var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function AudioroomRecordingJob(jobData) {
  if (!_.has(jobData, 'audio')) {
    throw new Error('No `audio` parameter provided');
  }
  if (!_.has(jobData, 'streamChannelId')) {
    throw new Error('No `streamChannelId` parameter provided');
  }
  AudioroomRecordingJob.super_.apply(this, arguments);
}

util.inherits(AudioroomRecordingJob, AbstractJob);

AudioroomRecordingJob.getPlugin = function() {
  return 'janus.plugin.cm.audioroom';
};

AudioroomRecordingJob.getEvent = function() {
  return 'audio-recording-finished';
};

AudioroomRecordingJob.prototype._run = function(tmpDir) {
  var self = this;
  var streamChannelId = this._jobData.streamChannelId;
  var audioFilename = this._jobData.audio;

  return tmpName({postfix: '.webm', dir: tmpDir})
    .then(function(webmFile) {
      return self._audioConvert(audioFilename, webmFile)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, webmFile)
        })
        .then(function() {
          var errorHandler = function(error) {
            if (error) {
              serviceLocator.get('logger').error(error);
            }
          };
          unlink(webmFile, errorHandler);
          unlink(audioFilename, errorHandler);
        });
    });
};

AudioroomRecordingJob.prototype._audioConvert = function(audioFilename, webmFile) {
  return this._runJobScript('mjr2webm', ['-a', audioFilename, webmFile]);
};

module.exports = AudioroomRecordingJob;
