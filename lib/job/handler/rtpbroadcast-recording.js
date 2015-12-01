var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var exec = require('child_process').exec;
var path = require('path');
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJobHandler = require('./abstract');

function RtpbroadcastRecordingHandler() {
  RtpbroadcastRecordingHandler.super_.apply(this, arguments);
}

util.inherits(RtpbroadcastRecordingHandler, AbstractJobHandler);

/**
 * @returns {String}
 */
RtpbroadcastRecordingHandler.prototype.getPlugin = function() {
  return 'janus.plugin.cm.rtpbroadcast';
};

/**
 * @returns {String}
 */
RtpbroadcastRecordingHandler.prototype.getEvent = function() {
  return 'recording-finished';
};

/**
 * @param {Object} jobData
 * @returns {Promise}
 */
RtpbroadcastRecordingHandler.prototype.handle = function(jobData) {
  var self = this;
  if (!_.has(jobData, 'audio')) {
    return Promise.reject(new Error('No `audio` parameter provided'));
  }
  if (!_.has(jobData, 'video')) {
    return Promise.reject(new Error('No `video` parameter provided'));
  }
  if (!_.has(jobData, 'streamChannelId')) {
    return Promise.reject(new Error('No `streamChannelId` parameter provided'));
  }

  var streamChannelId = jobData.streamChannelId;
  var audioFilename = jobData.audio;
  var videoFileName = jobData.video;

  var getMpegFilename = function() {
    return tmpName({
      postfix: '.mp4',
      dir: this._tempDir
    });
  };

  var audioVideoMerge = function(audioFileName, videoFileName, mpegFileName) {
    var shellScript = path.join(__dirname, '/../../../bin/', 'rtpbroadcast-merge.sh');
    return new Promise(function(resolve, reject) {
      self._exec([shellScript, audioFileName, videoFileName, mpegFileName].join(' '), function(error) {
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
      return audioVideoMerge(audioFilename, videoFileName, mpegFilename)
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
          unlink(videoFileName, errorHandler);
        });
    });
};

RtpbroadcastRecordingHandler.prototype._exec = exec;

module.exports = RtpbroadcastRecordingHandler;
