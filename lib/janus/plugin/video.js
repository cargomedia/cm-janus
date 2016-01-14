var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../../stream');
var Channel = require('../../channel');
var serviceLocator = require('../../service-locator');
var JanusError = require('../error');

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

PluginVideo.prototype.isAllowedMessage = function(message) {
  if (PluginVideo.super_.prototype.isAllowedMessage(message)) {
    var isDisallowed = 'message' === message['janus'] && 'list' === message['body']['request'];
    return !isDisallowed;
  } else {
    return false;
  }
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onCreate = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      var channel = Channel.generate(message['body']['id'], message['body']['channel_data']);
      plugin.setChannel(channel);
      plugin.stream = Stream.generate(channel, plugin);
      serviceLocator.get('logger').info('Added ' + plugin.stream + ' for ' + plugin);
      return serviceLocator.get('cm-api-client').publish(plugin.stream)
        .then(function() {
          serviceLocator.get('streams').add(plugin.stream);
          serviceLocator.get('logger').info('Storing ' + plugin.stream + ' for ' + plugin);
          return response;
        })
        .catch(function(error) {
          serviceLocator.get('http-client').detach(plugin);
          throw new JanusError.Error('Cannot publish: ' + plugin.stream + ' error: ' + error.message, 490, message['transaction']);
        });
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
      var channel = serviceLocator.get('channels').getByNameAndData(message['body']['id'], message['body']['channel_data']);
      plugin.stream = Stream.generate(channel, plugin);
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
PluginVideo.prototype.onSwitch = function(message) {
  var plugin = this;
  plugin.removeStream();
  var channel = serviceLocator.get('channels').getByNameAndData(message['body']['id'], message['body']['channel_data']);
  plugin.stream = Stream.generate(channel, plugin);
  serviceLocator.get('logger').info('Added ' + plugin.stream + ' for ' + plugin);
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      return plugin.subscribe(response);
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
  if (this.channel) {
    this.removeChannel();
  }
  this.removeStream();
  return Promise.resolve(message);
};

module.exports = PluginVideo;
