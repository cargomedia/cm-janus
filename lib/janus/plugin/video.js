var util = require('util');
var _ = require('underscore');
var Promise = require('bluebird');
var PluginStreaming = require('./streaming');
var Stream = require('../../stream');
var Channel = require('../../channel');
var serviceLocator = require('../../service-locator');

function PluginVideo(id, type, session) {
  PluginVideo.super_.apply(this, arguments);

  this._isPublish = false;
}

util.inherits(PluginVideo, PluginStreaming);

PluginVideo.TYPE = 'janus.plugin.cm.rtpbroadcast';

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.processMessage = function(message) {
  switch (message['janus']) {
    case 'message':
      switch (message['body']['request']) {
        case 'create':
          return this.onCreate(message);
        case 'watch':
          return this.onWatch(message);
        case 'switch':
          return this.onSwitch(message);
      }
      break;
    case 'event':
      if (_.isEqual(message['plugindata']['data'], {
          streaming: 'event',
          result: {
            status: 'stopped'
          }
        })) {
        return this.onStopped(message);
      }
      break;
  }

  return PluginVideo.super_.prototype.processMessage.call(this, message);
};

/**
 * @inheritDoc
 */
PluginVideo.prototype.publish = function() {
  return PluginVideo.super_.prototype.publish.call(this)
    .then(function(result) {
      this._isPublish = true;
      return result;
    }.bind(this));
};

/**
 * @inheritDoc
 */
PluginVideo.prototype.removeStream = function() {
  var plugin = this;
  return (new Promise(function(resolve, reject) {
    plugin.queue.push(function() {
      var promise;
      if (!plugin.stream || !plugin._isPublish) {
        promise = Promise.resolve();
      }
      if (plugin._isPublish) {
        var subscribeStreams = serviceLocator.get('streams').findAllByChannel(plugin.stream.channel);
        subscribeStreams = _.without(subscribeStreams, plugin.stream);
        promise = Promise.map(subscribeStreams, function(subscribeStream) {
          return subscribeStream.plugin.removeStream();
        }).then(function() {
          plugin._isPublish = false;
        });
      }
      return promise.then(resolve, reject);
    });
  })).then(function() {
    return PluginVideo.super_.prototype.removeStream.apply(plugin, arguments);
  });
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onCreate = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      var channel = new Channel(response['plugindata']['data']['stream']['uid'], message['body']['id'], message['body']['channel_data']);
      plugin.stream = Stream.generate(channel, plugin);
      serviceLocator.get('logger').info('Added stream', plugin.stream.getContext());
      return plugin.publish().return(response);
    } else {
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onWatch = function(message) {
  var plugin = this;
  this.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      var channel = new Channel(response['plugindata']['data']['result']['stream']['uid'], message['body']['id'], message['body']['channel_data']);
      plugin.stream = Stream.generate(channel, plugin);
      serviceLocator.get('logger').info('Added stream', plugin.stream.getContext());
    }
    return Promise.resolve(response);
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onSwitch = function(message) {
  var plugin = this;
  plugin.session.connection.transactions.add(message['transaction'], function(response) {
    if (plugin._isSuccessResponse(response)) {
      return plugin.removeStream()
        .then(function() {
          var channel = new Channel(response['plugindata']['data']['result']['next']['uid'], message['body']['id'], message['body']['channel_data']);
          plugin.stream = Stream.generate(channel, plugin);
          serviceLocator.get('logger').info('Added stream', plugin.stream.getContext());
          return plugin.subscribe();
        })
        .return(response);
    } else {
      return Promise.resolve(response);
    }
  });
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginVideo.prototype.onStopped = function(message) {
  return this.removeStream().return(message);
};

module.exports = PluginVideo;
