var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var exec = require('child_process').exec;
var path = require('path');
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJobHandler = require('./abstract');

function AudioroomRecordingHandler() {
  AudioroomRecordingHandler.super_.apply(this, arguments);
}

util.inherits(AudioroomRecordingHandler, AbstractJobHandler);

/**
 * @returns {String}
 */
AudioroomRecordingHandler.prototype.getPlugin = function() {
  return 'janus.plugin.cm.audioroom';
};

/**
 * @returns {String}
 */
AudioroomRecordingHandler.prototype.getEvent = function() {
  return 'audio-recording-finished';
};

/**
 * @param {Object} jobData
 * @returns {Promise}
 */
AudioroomRecordingHandler.prototype.handle = function(jobData) {
  var self = this;
  if (!_.has(jobData, 'audio')) {
    return Promise.reject(new Error('No `audio` parameter provided'));
  }
  if (!_.has(jobData, 'streamChannelId')) {
    return Promise.reject(new Error('No `streamChannelId` parameter provided'));
  }

  var streamChannelId = jobData.streamChannelId;
  var audioFilename = jobData.audio;

  var getMpegFilename = function() {
    return tmpName({
      postfix: '.mp3',
      dir: this._tempDir
    });
  };

  var audioConvert = function(audioFileName, mpegFileName) {
    var shellScript = path.join(__dirname, '/../../../bin/', 'audioroom-convert.sh');
    return new Promise(function(resolve, reject) {
      self._exec([shellScript, audioFileName, mpegFileName].join(' '), function(error) {
        if (null === error) {
          resolve();
        } else {
          reject(error);
        }
      })
    });
  };

  return getMpegFilename()
    .then(function(mpegFilename) {
      return audioConvert(audioFilename, mpegFilename)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, mpegFilename)
        })
        .then(function() {
          var errorHandler = function(error) {
            if (error) {
              serviceLocator.get('logger').error(error);
            }
          };
          unlink(mpegFilename, errorHandler);
          unlink(audioFilename, errorHandler);
        });
    });
};

AudioroomRecordingHandler.prototype._exec = exec;

module.exports = AudioroomRecordingHandler;
