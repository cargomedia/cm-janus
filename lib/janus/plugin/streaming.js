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

  return Promise.resolve();
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
      return serviceLocator.get('cm-api-client').publish(plugin.stream.channelName, plugin.stream.id, Date.now() / 1000, plugin.session.data, message['body']['channel_data'])
        .then(function() {
          serviceLocator.get('logger').info('adding stream', plugin.stream);
          serviceLocator.get('streams').add(plugin.stream);
        })
        .catch(function(error) {
          throw new JanusError.Fatal('Cannot publish: ' + plugin.stream + ' error: ' + error, 490, message['transaction']);
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
  var self = this;
  return serviceLocator.get('cm-api-client').subscribe(this.stream.channelName, this.stream.id, Date.now() / 1000, self.session.data)
    .then(function() {
      serviceLocator.get('logger').info('adding stream', self.stream);
      serviceLocator.get('streams').add(self.stream);
    })
    .catch(function(error) {
      throw new JanusError.Fatal('Cannot subscribe: ' + self.stream + ' error: ' + error, 490, message['transaction']);
    });
};

PluginStreaming.prototype.removeStream = function() {
  if (this.stream) {
    var streams = serviceLocator.get('streams');
    if (streams.has(stream.id)) {
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
