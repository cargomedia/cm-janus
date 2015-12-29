var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../../stream');
var serviceLocator = require('../../service-locator');

function PluginAudio(id, type, session) {
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
  var plugin = this;
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response) && 'joined' == response['plugindata']['data']['audioroom']) {
      plugin.stream = Stream.generate(message['body']['id'], plugin, '');
      serviceLocator.get('logger').info('Added ' + plugin.stream + ' for audio ' + plugin);
    }
    return Promise.resolve();
  });
  return Promise.resolve(message);
};

module.exports = PluginAudio;
