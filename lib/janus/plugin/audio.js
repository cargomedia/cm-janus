var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../../stream');
var Channel = require('../../channel');
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
  switch (message['janus']) {
    case 'message':
      switch (message['body']['request']) {
        case 'join':
          return this.onJoin(message);
        case 'changeroom':
          return this.onChangeroom(message);
      }
      break;
    case 'event':
      if (_.isMatch(message['plugindata']['data'], {audioroom: 'destroyed'})) {
        return this.onDestroyed(message);
      }
      break;
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
      var channel = new Channel(response['plugindata']['data']['uid'], message['body']['id'], message['body']['channel_data']);
      plugin.stream = Stream.generate(channel, plugin);
      serviceLocator.get('logger').info('Added stream for plugin', {stream: plugin.stream.id, plugin: plugin.id});
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
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response) && 'roomchanged' == response['plugindata']['data']['audioroom']) {
      return plugin.removeStream()
        .then(function() {
          var channel = new Channel(response['plugindata']['data']['uid'], message['body']['id'], message['body']['channel_data']);
          plugin.stream = Stream.generate(channel, plugin);
          serviceLocator.get('logger').info('Added stream for plugin', {stream: plugin.stream.id, plugin: plugin.id});
          return plugin.subscribe();
        })
        .return(response);
    }
    return Promise.resolve(response);
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.onDestroyed = function(message) {
  return this.removeStream().return(message);
};

module.exports = PluginAudio;
