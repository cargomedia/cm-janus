var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../../stream');
var Channel = require('../../channel');
var serviceLocator = require('../../service-locator');

function PluginVideo(id, type, session) {
  PluginVideo.super_.apply(this, arguments);
}

util.inherits(PluginVideo, PluginStreaming);

PluginVideo.TYPE = 'janus.plugin.cm.rtpbroadcast';

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.processMessage = function(message) {
  switch (message['janus']) {
    case 'message':
      switch (message['body']['request']) {
        case 'create':
          return this.onCreate(message);
        case 'watch':
          return this.onWatch(message);
        case 'switch':
          return this.onSwitch(message);
      }
      break;
    case 'event':
      if (_.isEqual(message['plugindata']['data'], {
          streaming: 'event',
          result: {
            status: 'stopped'
          }
        })) {
        return this.onStopped(message);
      }
      break;
  }

  return PluginVideo.super_.prototype.processMessage.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onCreate = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      var channel = new Channel(response['plugindata']['data']['stream']['uid'], message['body']['id'], message['body']['channel_data']);
      plugin.stream = Stream.generate(channel, plugin);
      serviceLocator.get('logger').info('Added stream', plugin.stream.getContext());
      return plugin.publish().return(response);
    } else {
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onWatch = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      var channel = new Channel(response['plugindata']['data']['result']['stream']['uid'], message['body']['id'], message['body']['channel_data']);
      plugin.stream = Stream.generate(channel, plugin);
      serviceLocator.get('logger').info('Added stream', plugin.stream.getContext());
    }
    return Promise.resolve(response);
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onSwitch = function(message) {
  var plugin = this;
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      return plugin.removeStream()
        .then(function() {
          var channel = new Channel(response['plugindata']['data']['result']['next']['uid'], message['body']['id'], message['body']['channel_data']);
          plugin.stream = Stream.generate(channel, plugin);
          serviceLocator.get('logger').info('Added stream', plugin.stream.getContext());
          return plugin.subscribe();
        })
        .return(response);
    } else {
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onStopped = function(message) {
  return this.removeStream().return(message);
};

module.exports = PluginVideo;
