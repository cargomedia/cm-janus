var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function AudioroomRecordingJob(jobData, configuration) {
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
  var wavFile = this._jobData.audio;

  return tmpName({postfix: '.mp3', dir: tmpDir})
    .then(function(mp3File) {
      return self._audioConvert(wavFile, mp3File)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, mp3File)
        })
        .then(function() {
          var errorHandler = function(error) {
            if (error) {
              serviceLocator.get('logger').error(error);
            }
          };
          unlink(mp3File, errorHandler);
          unlink(wavFile, errorHandler);
        });
    });
};

AudioroomRecordingJob.prototype._audioConvert = function(wavFile, mp3File) {
  var convertCommand = _.template(this._configuration.convertCommand)({
    wavFile: wavFile,
    mp3File: mp3File
  });
  return this._runJobScript(convertCommand);
};

module.exports = AudioroomRecordingJob;
