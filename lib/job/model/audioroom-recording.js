var Promise = require('bluebird');
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJob = require('./abstract');

function AudioroomRecordingJob(id, jobData, configuration) {
  if (!_.has(jobData, 'audio')) {
    throw new Error('No `audio` parameter provided');
  }
  if (!_.has(jobData, 'uid')) {
    throw new Error('No `uid` parameter provided');
  }
  AudioroomRecordingJob.super_.apply(this, arguments);
}

util.inherits(AudioroomRecordingJob, AbstractJob);

AudioroomRecordingJob.getPlugin = function() {
  return 'janus.plugin.cm.audioroom';
};

AudioroomRecordingJob.getEvent = function() {
  return 'archive-finished';
};

AudioroomRecordingJob.prototype._run = function() {
  var self = this;
  var channelUid = this._jobData.uid;
  var wavFile = this._jobData.audio;

  return this._tmpFilename('mp3')
    .then(function(mp3File) {
      return self._audioConvert(wavFile, mp3File)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(channelUid, mp3File)
        })
        .then(function() {
          return unlink(wavFile).catch(function(error) {
            serviceLocator.get('logger').error('Removing wave file failed', {error: error});
          });
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
