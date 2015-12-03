var Promise = require('bluebird');
var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../service-locator');
var Stream = require('../stream');
var JanusError = require('../janus-error');

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
  var self = this;
  this.connection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response)) {
      self.stream = Stream.generate(message['body']['id'], self);
      return serviceLocator.get('cm-api-client').publish(self.stream.channelName, self.stream.id, Date.now(), self.connection.session.data, message['channelData'])
        .then(function() {
          serviceLocator.get('logger').info('adding stream', self.stream);
          serviceLocator.get('streams').add(self.stream);
        })
        .catch(function(error) {
          throw new JanusError.Fatal('Cannot publish: ' + self.stream + ' error: ' + error, 490, message['transaction']);
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
  return serviceLocator.get('cm-api-client').subscribe(this.stream.channelName, this.stream.id, Date.now(), self.connection.session.data)
    .then(function() {
      serviceLocator.get('logger').info('adding stream', self.stream);
      serviceLocator.get('streams').add(self.stream);
    })
    .catch(function(error) {
      throw new JanusError.Fatal('Cannot subscribe: ' + self.stream + ' error: ' + error, 490, message['transaction']);
    });
};

PluginStreaming.prototype.onRemove = function() {
  if (this.stream) {
    serviceLocator.get('streams').remove(this.stream)
  }
  serviceLocator.get('logger').info('X Plugin ' + this.id);
};

module.exports = PluginStreaming;
