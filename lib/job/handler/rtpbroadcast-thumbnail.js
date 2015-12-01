var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var exec = require('child_process').exec;
var path = require('path');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');

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
  var self = this;
  if (!_.has(jobData, 'thumb')) {
    return Promise.reject(new Error('No `thumb` parameter provided'));
  }
  if (!_.has(jobData, 'id')) {
    return Promise.reject(new Error('No `id` parameter provided'));
  }

  var streamChannelId = jobData.id;
  var mjrFilename = jobData.thumb;
  var getPngFilename = function() {
    return tmpName({postfix: '.png'});
  };

  var extractThumbnail = function(mjrFilename, pngFilename) {
    var shellScript = path.join(__dirname, '/../../../bin/' ,'rtpbroadcast-thumb.sh');
    return new Promise(function(resolve, reject) {
      self._exec([shellScript, mjrFilename, pngFilename].join(' '), function(error) {
        if (null === error) {
          resolve();
        } else {
          reject(error);
        }
      })
    });
  };

  return getPngFilename()
    .then(function(pngFilename) {
      return extractThumbnail(mjrFilename, pngFilename)
        .then(function() {
          return serviceLocator.get('cm-application').importVideoStreamThumbnail(streamChannelId, pngFilename)
        })
        .then(function() {
          var errorHandler = function(error) {
            if (error) {
              serviceLocator.get('logger').error(error);
            }
          };
          unlink(pngFilename, errorHandler);
          unlink(mjrFilename, errorHandler);
        });
    });
};

RtpbroadcastThumbnailHandler.prototype._exec = exec;

module.exports = RtpbroadcastThumbnailHandler;
