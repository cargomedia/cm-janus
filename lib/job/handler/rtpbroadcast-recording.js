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
  var audioFilename = jobData.audio;
  var videoFileName = jobData.video;

  var mpegFilePromise = tmpName({postfix: '.mp4'});

  var executeGstreamer = function(audioFileName, videoFileName, mpegFileName) {
    return new Promise(function(resolve, reject) {
      exec('gst-launch-1.0 ' + [
        'filesrc',
        'locationAudion=' + audioFileName,
        'locationVideo=' + videoFileName,
        '! decodebin',
        '! videoconvert',
        '! pngenc snapshot=true',
        '! filesink location=' + mpegFileName
        ].join(' '), function(error) {
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
      return executeGstreamer(audioFilename, videoFileName, mpegFileName);
    })
    .then(function(mpegFileName) {
      serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, mpegFileName);
      //TODO promisify `importMediaStreamArchive()`
      return mpegFileName;
    })
    .then(function(mpegFileName) {
      return unlink(mpegFileName);
    });
};

module.exports = RtpbroadcastRecordingHandler;
