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

  var mpegFilePromise = tmpName({postfix: '.mp4'});

  var executeGstreamer = function(audioFileName, videoFileName, mpegFileName) {
    var shellScript = path.join(__dirname, 'rtpbroadcast-recording.js');
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
  //TODO fix gstreamer pipeline

  return mpegFilePromise
    .then(function(mpegFileName) {
      return executeGstreamer(audioFilename, videoFileName, mpegFileName)
        .then(function() {
          return serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, mpegFileName)
        })
        .then(function() {
          return unlink(mpegFileName);
        });
    });
};

module.exports = RtpbroadcastRecordingHandler;
