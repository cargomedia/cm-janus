var util = require('util');
var Promise = require('bluebird');
var PluginAbstract = require('./abstract.js');
var Stream = require('../stream');
var JanusError = require('../janus-error');
var serviceLocator = require('../service-locator');

function PluginAudio(id, type, proxyConnection) {
  PluginAudio.super_.apply(this, arguments);

  this.stream = null;
}

util.inherits(PluginAudio, PluginAbstract);

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];

  if ('message' === janusMessage && 'join' === message['body']['request']) {
    return this.onJoin(message);
  }

  return PluginAudio.super_.prototype.processMessage(message);
};


/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAudio.prototype.onJoin = function(message) {
  var self = this;
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    self.stream = Stream.generate(message['body']['id'], self.proxyConnection);
    serviceLocator.get('cm-api-client').publish(self.stream.channelName, self.stream.id, Date.now(), self.proxyConnection.sessionData)
      .then(function() {
        serviceLocator.get('logger').info('adding stream', self.stream);
        serviceLocator.get('streams').add(self.stream);
      })
      .catch(function(error) {
        self.stream.connection.close();
        throw new JanusError.Error('Cannot publish: ', error);
      });
  });
  return Promise.resolve(message);
};

module.exports = PluginAudio;
