var PluginAbstract = require('./abstract.js');
var Stream = require('../stream');
var Promise = require('bluebird');
var util = require('util');
var auth = require('../auth');
var streams = require('../streams');
var logger = require('../logger');
var JanusError = require('../janus-error');

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
PluginAbstract.prototype.onJoin = function(message) {
  var self = this;
  //message
  self.proxyConnection.transactions.add(message['transaction'], function(response) {
    self.stream = Stream.generate(message['body']['room'], self.proxyConnection);
    logger.info('adding stream', self.stream);
    streams.add(self.stream);
  });
  return Promise.resolve(message);
/*
  return auth.canSubscribe(message['session_id'], message['body']['id'])
    .then(function() {
      self.proxyConnection.transactions.add(message['transaction'], function(response) {
        self.stream = Stream.generate(message['body']['id'], self.proxyConnection);
        logger.info('adding stream', self.stream);
        streams.add(self.stream);
      });
      return Promise.resolve(message);
    }).catch(function() {
      throw new JanusError.Unauthorized(message['transaction']);
    });
*/
};

module.exports = PluginAudio;
