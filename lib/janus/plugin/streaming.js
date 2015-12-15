var Promise = require('bluebird');
var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../../service-locator');
var Stream = require('../../stream');
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

  if ('message' === janusMessage && 'create' === message['body']['request']) {
    return this.onCreate(message);
  }

  if ('webrtcup' === janusMessage) {
    return this.onWebrtcup(message);
  }

  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onCreate = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      plugin.stream = Stream.generate(message['body']['id'], plugin);
      serviceLocator.get('logger').info('Added ' + plugin.stream + ' for ' + plugin);
      return serviceLocator.get('cm-api-client').publish(plugin.stream.channelName, plugin.stream.id, Date.now() / 1000, plugin.session.data, message['body']['channel_data'])
        .then(function() {
          serviceLocator.get('streams').add(plugin.stream);
          serviceLocator.get('logger').info('Storing ' + plugin.stream + ' for ' + plugin);
        })
        .catch(function(error) {
          serviceLocator.get('http-client').detach(plugin);
          throw new JanusError.Error('Cannot publish: ' + plugin.stream + ' error: ' + error.message, 490, message['transaction']);
        });
    } else {
      return Promise.resolve();
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onWebrtcup = function(message) {
  var plugin = this;
  return serviceLocator.get('cm-api-client').subscribe(plugin.stream.channelName, plugin.stream.id, Date.now() / 1000, plugin.session.data)
    .then(function() {
      serviceLocator.get('streams').add(plugin.stream);
      serviceLocator.get('logger').info('Storing ' + plugin.stream + ' for ' + plugin);
    })
    .catch(function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot subscribe: ' + plugin.stream + ' error: ' + error.message, 490, message['transaction']);
    });
};

PluginStreaming.prototype.removeStream = function() {
  if (this.stream) {
    serviceLocator.get('cm-api-client').removeStream(this.stream.channelName, this.stream.id);
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
