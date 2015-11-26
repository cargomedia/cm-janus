var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../stream');
var JanusError = require('../janus-error');
var serviceLocator = require('../service-locator');

function PluginVideo(id, type, proxyConnection) {
  PluginVideo.super_.apply(this, arguments);
}

util.inherits(PluginVideo, PluginStreaming);

PluginVideo.TYPE = 'janus.plugin.cm.rtpbroadcast';

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];

  if ('message' === janusMessage && 'watch' === message['body']['request']) {
    return this.onWatch(message);
  }

  return PluginVideo.super_.prototype.processMessage.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onWatch = function(message) {
  var self = this;
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response)) {
      self.stream = Stream.generate(message['body']['id'], self.proxyConnection);
    }
    return Promise.resolve();
  });
  return Promise.resolve(message);
};

module.exports = PluginVideo;
