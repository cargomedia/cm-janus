var PluginAbstract = require('./abstract.js');
var Stream = require('../stream');
var Promise = require('bluebird');
var util = require('util');
var auth = require('../auth');
var streams = require('../streams');
var logger = require('../logger');
var JanusError = require('../janus-error');

function PluginVideo(id, type, proxyConnection) {
  PluginVideo.super_.apply(this, arguments);
}

util.inherits(PluginVideo, PluginAbstract);

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

  return PluginVideo.super_.prototype.processMessage(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onCreate = function(message) {
  var self = this;
  return auth.canPublish(message['token'], message['body']['id'])
    .then(function() {
      self.proxyConnection.transactions.add(message['transaction'], function(response) {
        self.stream = Stream.generate(message['body']['id'], self.proxyConnection, true);
        logger.info('adding stream', self.stream);
        streams.add(self.stream);
      });
      return Promise.resolve(message);
    }).catch(function() {
      throw new JanusError.Unauthorized(message['transaction']);
    });
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onWatch = function(message) {
  var self = this;
  return auth.canSubscribe(message['session_id'], message['body']['id'])
    .then(function() {
      self.proxyConnection.transactions.add(message['transaction'], function(response) {
        self.stream = Stream.generate(message['body']['id'], self.proxyConnection, false);
        logger.info('adding stream', self.stream);
        streams.add(self.stream);
      });
      return Promise.resolve(message);
    }).catch(function() {
      throw new JanusError.Unauthorized(message['transaction']);
    });
};

module.exports = PluginVideo;
