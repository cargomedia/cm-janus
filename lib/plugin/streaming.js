var Promise = require('bluebird');
var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../service-locator');
var Stream = require('../stream');

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
  if ('hangup' === janusMessage) {
    return this.onHangup(message);
  }
  if ('detach' === janusMessage) {
    return this.onHangup(message);
  }

  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onCreate = function(message) {
  var self = this;
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response)) {
      self.stream = Stream.generate(message['body']['id'], self);
      return serviceLocator.get('cm-api-client').publish(self.stream.channelName, self.stream.id, Date.now(), self.proxyConnection.sessionData, message['channelData'])
        .then(function() {
          serviceLocator.get('logger').info('adding stream', self.stream);
          serviceLocator.get('streams').add(self.stream);
        })
        .catch(function(error) {
          self.proxyConnection.close();
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
PluginStreaming.prototype.onWebrtcup = function(message) {
  var self = this;
  return serviceLocator.get('cm-api-client').subscribe(this.stream.channelName, this.stream.id, Date.now(), self.proxyConnection.sessionData)
    .then(function() {
      serviceLocator.get('logger').info('adding stream', self.stream);
      serviceLocator.get('streams').add(self.stream);
    })
    .catch(function(error) {
      serviceLocator.get('logger').info('Cannot subscribe: ', error);
      self.proxyConnection.close();
    });
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onHangup = function(message) {
  this.proxyConnection.removePlugin(this.id);
  this.proxyConnection.close();
  return Promise.resolve(message);
};

module.exports = PluginStreaming;
