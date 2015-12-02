var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../stream');
var JanusError = require('../janus-error');
var serviceLocator = require('../service-locator');

function PluginAudio(id, type, proxyConnection) {
  PluginAudio.super_.apply(this, arguments);
}

util.inherits(PluginAudio, PluginStreaming);

PluginAudio.TYPE = 'janus.plugin.cm.audioroom';

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];

  if ('message' === janusMessage && 'join' === message['body']['request']) {
    return this.onJoin(message);
  }

  return PluginAudio.super_.prototype.processMessage.call(this, message);
};


/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.onJoin = function(message) {
  var self = this;
  self.proxyConnection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response) && 'joined' == response['plugindata']['data']['audioroom']) {
      self.stream = Stream.generate(message['body']['id'], self);
    }
    return Promise.resolve();
  });
  return Promise.resolve(message);
};

module.exports = PluginAudio;
