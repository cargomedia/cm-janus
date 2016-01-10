var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../../stream');
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
  var janusMessage = message['janus'];

  if ('message' === janusMessage && 'create' === message['body']['request']) {
    return this.onCreate(message);
  }

  if ('message' === janusMessage && 'watch' === message['body']['request']) {
    return this.onWatch(message);
  }

  if ('message' === janusMessage && 'switch' === message['body']['request']) {
    return this.onSwitch(message);
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
PluginStreaming.prototype.onCreate = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      plugin.stream = Stream.generate(message['body']['id'], message['body']['channel_data'], plugin);
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
PluginVideo.prototype.onSwitch = function(message) {
  var plugin = this;
  plugin.removeStream();
  plugin.stream = Stream.generate(message['body']['id'], message['body']['channel_data'], plugin);
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

module.exports = PluginVideo;
