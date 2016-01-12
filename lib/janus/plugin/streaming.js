var Promise = require('bluebird');
var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../../service-locator');
var JanusError = require('../error');

function PluginStreaming() {
  PluginStreaming.super_.apply(this, arguments);
  this.stream = null;
}

util.inherits(PluginStreaming, PluginAbstract);

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];

  if ('webrtcup' === janusMessage) {
    return this.subscribe(message);
  }
  return PluginStreaming.super_.prototype.processMessage.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.subscribe = function(message) {
  var plugin = this;
  return serviceLocator.get('cm-api-client').subscribe(plugin.stream)
    .then(function() {
      serviceLocator.get('streams').add(plugin.stream);
      serviceLocator.get('logger').info('Storing ' + plugin.stream + ' for ' + plugin);
      return message;
    })
    .catch(function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot subscribe: ' + plugin.stream + ' error: ' + error.message, 490, message['transaction']);
    });
};

PluginStreaming.prototype.removeStream = function() {
  if (this.stream) {
    serviceLocator.get('cm-api-client').removeStream(this.stream);
    var streams = serviceLocator.get('streams');
    if (streams.has(this.stream.id)) {
      streams.remove(this.stream);
    }
    this.stream = null;
  }
};

/**
 * @param {Channel} channel
 */
PluginStreaming.prototype.setChannel = function(channel) {
  if (this.channel) {
    throw new Error('Channel already set: ' + this.channel);
  }
  this.channel = channel;
  serviceLocator.get('channels').add(this.channel);
};

PluginStreaming.prototype.removeChannel = function() {
  if (this.channel) {
    var channels = serviceLocator.get('channels');
    if (channels.contains(this.channel)) {
      channels.remove(this.channel);
    }
    this.channel = null;
  }
};

PluginStreaming.prototype.onRemove = function() {
  this.removeChannel();
  this.removeStream();
  PluginStreaming.super_.prototype.onRemove.call(this);
};

module.exports = PluginStreaming;
