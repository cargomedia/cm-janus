var util = require('util');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../stream');
var JanusError = require('../janus-error');
var serviceLocator = require('../service-locator');

function PluginVideo(id, type, proxyConnection) {
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

  return PluginVideo.super_.prototype.processMessage.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onCreate = function(message) {
  var self = this;
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response)) {
      self.stream = Stream.generate(message['body']['id'], self.proxyConnection);
      return serviceLocator.get('cm-api-client').publish(self.stream.channelName, self.stream.id, Date.now(), self.proxyConnection.sessionData)
        .then(function() {
          serviceLocator.get('logger').info('adding stream', self.stream);
          serviceLocator.get('streams').add(self.stream);
        })
        .catch(function(error) {
          self.stream.connection.close();
          throw new JanusError.Error('Cannot publish: ', error);
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
PluginVideo.prototype.onWatch = function(message) {
  var self = this;
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response)) {
      self.stream = Stream.generate(message['body']['id'], self.proxyConnection);
    }
    return Promise.resolve();
  });
  return Promise.resolve(message);
};

module.exports = PluginVideo;
