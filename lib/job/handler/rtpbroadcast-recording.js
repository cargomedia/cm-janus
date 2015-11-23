var Promise = require('bluebird');
var serviceLocator = require('../../service-locator');
var path = require('path');
var tmp = require('tmp');
var execSync = require('child_process').execSync;

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

  execSync('gst-launch-1.0', [
    'filesrc',
    'location=' + webmFile,
    '! decodebin',
    '! videoconvert',
    '! pngenc snapshot=true',
    '! filesink location=' + pngFile
  ]);
  //TODO fix gstreamer pipeline


  serviceLocator.get('cm-application').importMediaStreamArchive(streamChannelId, mpegFile);
};

module.exports = RtpbroadcastRecordingHandler;
