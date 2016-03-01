var util = require('util');
var PluginAbstract = require('./abstract.js');
var serviceLocator = require('../../service-locator');
var JanusError = require('../error');
var Promise = require('bluebird');
var async = require('async');

function PluginStreaming() {
  PluginStreaming.super_.apply(this, arguments);

  /** @type {Stream|null} */
  this.stream = null;

  this.queue = async.queue(function(task, callback) {
    task().then(callback, callback);
  }, 1);
}

util.inherits(PluginStreaming, PluginAbstract);

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];

  if ('webrtcup' === janusMessage) {
    return this.subscribe().return(message);
  }
  if ('hangup' === janusMessage) {
    return this.onHangup(message);
  }
  return PluginStreaming.super_.prototype.processMessage.call(this, message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginStreaming.prototype.onHangup = function(message) {
  return this.removeStream().return(message);
};

/**
 * @returns {Promise}
 */
PluginStreaming.prototype.subscribe = function() {
  var plugin = this;
  var stream = plugin.getStream();
  return (new Promise(function(resolve, reject) {
    plugin.queue.push(function() {
      return serviceLocator.get('streams').addSubscribe(stream).then(resolve, reject);
    });
  }))
    .catch(JanusError.Error, function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot subscribe: ' + stream + ' for ' + plugin + 'error: ' + error.message, 490);
    });
};

/**
 * @returns {Promise}
 */
PluginStreaming.prototype.publish = function() {
  var plugin = this;
  var stream = plugin.getStream();
  return (new Promise(function(resolve, reject) {
    plugin.queue.push(function() {
      return serviceLocator.get('streams').addPublish(stream).then(resolve, reject);
    });
  }))
    .catch(JanusError.Error, function(error) {
      serviceLocator.get('http-client').detach(plugin);
      throw new JanusError.Error('Cannot publish: ' + stream + ' for ' + plugin + ' error: ' + error.message, 490);
    });
};

/**
 * @returns {Stream}
 */
PluginStreaming.prototype.getStream = function() {
  if (null === this.stream) {
    throw new JanusError.Warning('No Stream found for ' + this);
  }
  return this.stream;
};

PluginStreaming.prototype.removeStream = function() {
  var plugin = this;
  return (new Promise(function(resolve, reject) {
    plugin.queue.push(function() {
      var promise;
      if (!plugin.stream) {
        promise = Promise.resolve();
      } else {
        promise = serviceLocator.get('streams').remove(plugin.stream).then(function() {
          plugin.stream = null;
        })
      }
      return promise.then(resolve, reject);
    });
  }));
};

PluginStreaming.prototype.onRemove = function() {
  return this.removeStream().then(function() {
    return PluginStreaming.super_.prototype.onRemove.call(this);
  }.bind(this));
};

module.exports = PluginStreaming;
