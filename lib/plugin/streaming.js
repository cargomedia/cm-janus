var Promise = require('bluebird');
var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../service-locator');

function PluginStreaming(id, type, session) {
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

  if ('webrtcup' === janusMessage) {
    return this.onWebrtcup(message);
  }
  if ('hangup' === janusMessage) {
    return this.onHangup(message);
  }
  return Promise.resolve();
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
      serviceLocator.get('logger').info('Cannot subscribe: ', error);
      self.getConnection().close();
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
  var ProxyConnection = require('../proxy-connection');

  return new Promise(function(resolve) {
    var streams = serviceLocator.get('streams');
    var stream = this.stream;
    streams.on('remove', function removeStream(removedStream) {
      if (stream.id == removedStream) {
        streams.removeListener('remove', removeStream);
        resolve();
      }
    });

    this.connection.janusConnection.send({
      janus: 'message',
      body: {request: 'stop'},
      transaction: ProxyConnection.generateTransactionId(),
      session_id: this.id,
      handle_id: this._getPluginByStreamId(streamId).id
    });
  }.bind(this));
};

module.exports = PluginStreaming;
