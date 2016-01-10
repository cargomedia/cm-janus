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

  if ('message' === janusMessage && 'changeroom' === message['body']['request']) {
    return this.onChangeroom(message);
  }

  return PluginAudio.super_.prototype.processMessage.call(this, message);
};

PluginAudio.prototype.isAllowedMessage = function(message) {
  if (PluginAudio.super_.prototype.isAllowedMessage(message)) {
    var isDisallowed = 'message' === message['janus'] && _.contains(['list', 'exists', 'resetdecoder', 'listparticipants'], message['body']['request']);
    return !isDisallowed;
  } else {
    return false;
  }
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.onJoin = function(message) {
  var plugin = this;
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response) && 'joined' == response['plugindata']['data']['audioroom']) {
      plugin.stream = Stream.generate(message['body']['id'], message['body']['channel_data'], plugin);
      serviceLocator.get('logger').info('Added ' + plugin.stream + ' for ' + plugin);
    }
    return Promise.resolve(response);
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.onChangeroom = function(message) {
  var plugin = this;
  plugin.removeStream();
  plugin.stream = Stream.generate(message['body']['id'], message['body']['channel_data'], plugin);
  serviceLocator.get('logger').info('Added ' + plugin.stream + ' for ' + plugin);
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response) && 'roomchanged' == response['plugindata']['data']['audioroom']) {
      return plugin.subscribe(response);
    }
    return Promise.resolve(response);
  });
  return Promise.resolve(message);
};

module.exports = PluginAudio;
