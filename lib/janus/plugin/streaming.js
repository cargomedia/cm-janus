var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../../service-locator');
var JanusError = require('../error');
var Promise = require('bluebird');

function PluginStreaming() {
  PluginStreaming.super_.apply(this, arguments);

  /** @type {Stream|null} */
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
  if ('hangup' === janusMessage) {
    return this.onHangup(message);
  }
  return PluginStreaming.super_.prototype.processMessage.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onHangup = function(message) {
  this.removeStream();
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.subscribe = function(message) {
  var plugin = this;
  return serviceLocator.get('streams').addSubscribe(plugin.getStream())
    .catch(JanusError.Error, function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot subscribe: ' + plugin.stream + ' for ' + plugin + 'error: ' + error.message, 490, message['transaction']);
    })
    .then(function() {
      return message;
    })
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.publish = function(message) {
  var plugin = this;
  var stream = plugin.getStream();
  return serviceLocator.get('streams').addPublish(stream)
    .catch(JanusError.Error, function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot publish: ' + stream + ' for ' + plugin + ' error: ' + error.message, 490, message['transaction']);
    })
    .then(function() {
      return message;
    });
};

/**
 * @returns {Stream}
 */
PluginStreaming.prototype.getStream = function() {
  if (null === this.stream) {
    throw new JanusError.Warning('No Stream found for ' + this);
  }
  return this.stream;
};

PluginStreaming.prototype.removeStream = function() {
  if (this.stream) {
    serviceLocator.get('streams').remove(this.getStream());
    this.stream = null;
  }
};

PluginStreaming.prototype.onRemove = function() {
  this.removeStream();
  PluginStreaming.super_.prototype.onRemove.call(this);
};

module.exports = PluginStreaming;
