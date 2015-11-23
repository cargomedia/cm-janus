var Promise = require('bluebird');
var CommandRunner = require('../../command-runner');
var serviceLocator = require('../../service-locator');
var path = require('path');
var tmp = require('tmp');
var execSync = require('child_process').execSync;

function RtpbroadcastThumbnailHandler() {
}

/**
 * @returns {String}
 */
RtpbroadcastThumbnailHandler.prototype.getPlugin = function() {
  return 'janus.plugin.cm.rtpbroadcast';
};

/**
 * @returns {String}
 */
RtpbroadcastThumbnailHandler.prototype.getEvent = function() {
  return 'thumbnailing-finished';
};

/**
 * @param {Object} jobData
 * @returns {Promise}
 */
RtpbroadcastThumbnailHandler.prototype.handle = function(jobData) {
  var streamChannelId = jobData.id;
  var mjrFile = jobData.thumb;
  var webmFile = tmp.tmpNameSync({postfix: '.webm'});
  var pngFile = tmp.tmpNameSync({postfix: '.png'});

  execSync('janus-pp-rec', [mjrFile, webmFile]);
  execSync('gst-launch-1.0', [
    'filesrc',
    'location=' + webmFile,
    '! decodebin',
    '! videoconvert',
    '! pngenc snapshot=true',
    '! filesink location=' + pngFile
  ]);
  serviceLocator.get('cm-application').importVideoStreamThumbnail(streamChannelId, pngFile);
};

module.exports = RtpbroadcastThumbnailHandler;
