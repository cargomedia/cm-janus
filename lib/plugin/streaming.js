var PluginAbstract = require('./abstract.js');
var Stream = require('../stream');
var JanusError = require('../janus-error');
var util = require('util');

var serviceLocator = require('../service-locator');

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
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    self.stream = Stream.generate(message['body']['id'], self.proxyConnection, true);
    serviceLocator.get('cmApiClient').publish(self.stream.channelName, self.stream.id, Date.now())
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

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onWatch = function(message) {
  var self = this;
  this.proxyConnection.transactions.add(message['transaction'], function(response) {
    self.stream = Stream.generate(message['body']['id'], self.proxyConnection, false);
  });
  return Promise.resolve(message);
};


/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onWebrtcup = function(message) {
  var self = this;
  return serviceLocator.get('cmApiClient').subscribe(this.stream.channelName, this.stream.id, Date.now())
    .then(function() {
      serviceLocator.get('logger').info('adding stream', self.stream);
      serviceLocator.get('streams').add(self.stream);
    })
    .catch(function(error) {
      serviceLocator.get('logger').info('Cannot subscribe: ', error);
      self.stream.connection.close();
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
