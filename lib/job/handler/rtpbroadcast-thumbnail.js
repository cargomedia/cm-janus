var Promise = require('bluebird');
var tmpName = Promise.promisify(require('tmp').tmpName);
var unlink = Promise.promisify(require('fs').unlink);
var util = require('util');
var _ = require('underscore');

var serviceLocator = require('../../service-locator');
var AbstractJobHandler = require('./abstract');

function RtpbroadcastThumbnailHandler() {
  RtpbroadcastThumbnailHandler.super_.apply(this, arguments);
}

util.inherits(RtpbroadcastThumbnailHandler, AbstractJobHandler);

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
    return tmpName({
      postfix: '.png',
      dir: self.getTempDir()
    });
  };

  return getPngFilename()
    .then(function(pngFilename) {
      return self._extractThumbnail(mjrFilename, pngFilename)
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

RtpbroadcastThumbnailHandler.prototype._extractThumbnail = function(mjrFilename, pngFilename) {
  return this._runJobScript('rtpbroadcast-thumb.sh', [mjrFilename, pngFilename]);
};

module.exports = RtpbroadcastThumbnailHandler;
