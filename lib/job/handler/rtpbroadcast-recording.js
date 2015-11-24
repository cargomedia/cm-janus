var Promise = require('bluebird');
var tmp = require('tmp');
var exec = require('child-process-promise').exec;

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

  var mpegFile = tmp.tmpNameSync({postfix: '.mp4'});

  var gstreamerResult = new Promise(function(resolve, reject) {
    exec('gst-launch-1.0', [
      'filesrc',
      'locationAudion=' + audioFile,
      '! locationVideo=' + videoFile,
      '! decodebin',
      '! videoconvert',
      '! pngenc snapshot=true',
      '! filesink location=' + mpegFile
    ], function(error) {
      if (null === error) {
        resolve();
      }
      else {
        reject(error);
      }
    })
  });
  //TODO fix gstreamer pipeline

  return gstreamerResult
    .then(function() {
      serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, mpegFile)
    })
    .catch(function(error) {
      serviceLocator.get('logger').error('exec error: ' + error);
    });
};

module.exports = RtpbroadcastRecordingHandler;
