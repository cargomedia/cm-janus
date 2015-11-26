var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var exec = require('child_process').exec;

var serviceLocator = require('../../service-locator');

function AudioroomRecordingHandler() {
}

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
  var streamChannelId = jobData.streamChannelId;
  var audioFile = jobData.audio;

  var mpegFilePromise = tmpName({postfix: '.mp3'});

  var executeGstreamer = function(audioFile, mpegFile) {
    return new Promise(function(resolve, reject) {
      exec('gst-launch-1.0 ' + [
          'filesrc',
          'locationAudion=' + audioFile,
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
    .then(function(mpegFileName) {
      return executeGstreamer(audioFile, mpegFileName);
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

module.exports = AudioroomRecordingHandler;
