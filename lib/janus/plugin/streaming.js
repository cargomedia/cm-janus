var Promise = require('bluebird');
var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../../service-locator');
var Stream = require('../../stream');
var generateTransactionId = require('../util').generateTransactionId;
var JanusError = require('../error');

function PluginStreaming(id, type, session) {
  PluginStreaming.super_.apply(this, arguments);

  /** @type {Stream|null} */
  this.stream = null;
}

util.inherits(PluginStreaming, PluginAbstract);

PluginStreaming.prototype.processRequest = function(message) {
  var janusMessage = message['janus'];

  if ('message' === janusMessage && 'create' === message['body']['request']) {
    return this.onCreate(message);
  }
  return PluginStreaming.super_.prototype.processRequest.call(this, message);
};

PluginStreaming.prototype.processIncoming = function(message) {
  var janusMessage = message['janus'];
  if ('webrtcup' === janusMessage) {
    return this.onWebrtcup(message);
  }
  if ('hangup' === janusMessage) {
    return this.onHangup(message);
  }
  return PluginStreaming.super_.prototype.processIncoming.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onCreate = function(message) {
  var self = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (self._isSuccessResponse(response)) {
      self.stream = Stream.generate(message['body']['id'], self);
      return serviceLocator.get('cm-api-client').publish(self.stream.channelName, self.stream.id, Date.now(), self.session.data, message['channelData'])
        .then(function() {
          serviceLocator.get('logger').info('adding stream', self.stream);
          serviceLocator.get('streams').add(self.stream);
        })
        .catch(function(error) {
          throw new JanusError.Unauthorized('Cannot publish: ', error);
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
  return serviceLocator.get('cm-api-client').subscribe(this.stream.channelName, this.stream.id, Date.now(), self.session.data)
    .then(function() {
      serviceLocator.get('logger').info('adding stream', self.stream);
      serviceLocator.get('streams').add(self.stream);
    })
    .catch(function(error) {
      self.session.connection.close();
      serviceLocator.get('logger').info('Cannot subscribe: ', error);
    });
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onHangup = function(message) {
  this.session.plugins.remove(this);
  return Promise.resolve(message);
};

/**
 * @returns {Promise}
 */
PluginStreaming.prototype.stopStream = function() {
  return new Promise(function(resolve) {
    var streams = serviceLocator.get('streams');
    var stream = this.stream;
    streams.on('remove', function removeStream(removedStream) {
      if (stream.id == removedStream) {
        streams.removeListener('remove', removeStream);
        resolve();
      }
    });

    this.session.connection.janusConnection.send({
      janus: 'message',
      body: {request: 'stop'},
      transaction: generateTransactionId(),
      session_id: this.session.id,
      handle_id: this.id
    });
  }.bind(this));
};

module.exports = PluginStreaming;
