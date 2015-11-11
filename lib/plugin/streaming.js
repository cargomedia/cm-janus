var PluginAbstract = require('./abstract.js');
var Stream = require('../stream');
var JanusError = require('../janus-error');
var util = require('util');

var services = require('../services');
var auth = services.get('auth');
var streams = services.get('streams');
var logger = services.get('logger');
var cmApiClient = services.get('cm-api-client');

function PluginStreaming(id, type, proxyConnection) {
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
  if ('message' === janusMessage && 'watch' === message['body']['request']) {
    return this.onWatch(message);
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
PluginStreaming.prototype.onWatch = function(message) {
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


/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onWebrtcup = function(message) {
  cmApiClient.subscribe(this.stream.channelName, this.stream.id, Date.now());
  return Promise.resolve(message);
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
