var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../../service-locator');
var JanusError = require('../error');
var Promise = require('bluebird');

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
  return Promise.resolve()
    .then(function() {
      return serviceLocator.get('cm-api-client').subscribe(plugin.getStream())
    })
    .then(function() {
      var stream = plugin.getStream();
      serviceLocator.get('streams').add(stream);
      serviceLocator.get('logger').info('Storing ' + stream + ' for ' + plugin);
      return message;
    })
    .catch(JanusError.Error, function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot subscribe: ' + plugin.stream + ' for ' + plugin + 'error: ' + error.message, 490, message['transaction']);
    });
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.publish = function(message) {
  var plugin = this;
  return Promise.resolve()
    .then(function() {
      return serviceLocator.get('cm-api-client').publish(plugin.getStream())
    })
    .then(function() {
      var stream = plugin.getStream();
      serviceLocator.get('streams').add(stream);
      serviceLocator.get('logger').info('Storing ' + stream + ' for ' + plugin);
      return message;
    })
    .catch(JanusError.Error, function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot publish: ' + plugin.stream + ' for ' + plugin + ' error: ' + error.message, 490, message['transaction']);
    });
};

PluginStreaming.prototype.getStream = function() {
  if (null === this.stream) {
    throw new JanusError.Warning('No Stream found for ' + this);
  }
  return this.stream;
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

PluginStreaming.prototype.onRemove = function() {
  this.removeStream();
  PluginStreaming.super_.prototype.onRemove.call(this);
};

module.exports = PluginStreaming;
