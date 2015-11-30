var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var exec = require('child_process').exec;
var path = require('path');

var serviceLocator = require('../../service-locator');

function RtpbroadcastRecordingHandler() {
}

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
  var streamChannelId = jobData.streamChannelId;
  var audioFilename = jobData.audio;
  var videoFileName = jobData.video;

  var getMpegFilename = function() {
    return tmpName({postfix: '.mp4'});
  };

  var audioVideoMerge = function(audioFileName, videoFileName, mpegFileName) {
    var shellScript = path.join(__dirname, 'rtpbroadcast-recording.sh');
    return new Promise(function(resolve, reject) {
      exec([shellScript, audioFileName, videoFileName, mpegFileName].join(' '), function(error) {
        if (null === error) {
          resolve(mpegFileName);
        }
        else {
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

module.exports = RtpbroadcastRecordingHandler;
