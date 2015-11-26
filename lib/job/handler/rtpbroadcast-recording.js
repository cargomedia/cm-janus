var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var exec = require('child_process').exec;

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
  var audioFile = jobData.audio;
  var videoFile = jobData.video;

  var mpegFilePromise = tmpName({postfix: '.mp4'});

  var executeGstreamer = function(audioFile, videoFile, mpegFile) {
    return new Promise(function(resolve, reject) {
      exec('gst-launch-1.0' + [
        'filesrc',
        'locationAudion=' + audioFile,
        'locationVideo=' + videoFile,
        '! decodebin',
        '! videoconvert',
        '! pngenc snapshot=true',
        '! filesink location=' + mpegFile
        ].join(' '), function(error) {
        if (null === error) {
          resolve(mpegFile);
        }
        else {
          reject(error);
        }
      })
    });
  };
  //TODO fix gstreamer pipeline

  return mpegFilePromise
    .then(function(fileName) {
      return executeGstreamer(audioFile, videoFile, fileName);
    })
    .then(function(fileName) {
      serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, fileName);
      //TODO promisify `importMediaStreamArchive()`
      return fileName;
    })
    .then(function(fileName) {
      return unlink(fileName);
    });
};

module.exports = RtpbroadcastRecordingHandler;
