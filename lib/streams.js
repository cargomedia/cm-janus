var _ = require('underscore');
var util = require('util');
var Promise = require('bluebird');
var Stream = require('./stream');
var serviceLocator = require('./service-locator');

function Streams() {
  this.list = {};
}

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
Streams.prototype.addPublish = function(stream) {
  if (!(stream instanceof Stream)) {
    return Promise.reject(new Error('Must be instance of `Stream`'));
  }
  return serviceLocator.get('cm-api-client').publish(stream).then(function() {
    this._add(stream);
    serviceLocator.get('logger').info('Storing stream', stream.getContext());
  }.bind(this));
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
Streams.prototype.addSubscribe = function(stream) {
  if (!(stream instanceof Stream)) {
    return Promise.reject(new Error('Must be instance of `Stream`'));
  }
  return serviceLocator.get('cm-api-client').subscribe(stream).then(function() {
    this._add(stream);
    serviceLocator.get('logger').info('Storing stream', stream.getContext());
  }.bind(this));
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
Streams.prototype.unregister = function(stream) {
  if (!(stream instanceof Stream)) {
    return Promise.reject(new Error('Must be instance of `Stream`'));
  }
  return serviceLocator.get('cm-api-client').removeStream(stream).then(function() {
    this.remove(stream);
  }.bind(this));
};

/**
 * @param {Stream} stream
 */
Streams.prototype.remove = function(stream) {
  this._remove(stream);
  serviceLocator.get('logger').info('Removed stream', stream.getContext());
};

/**
 * @param {String} streamId
 * @returns {Stream|null}
 */
Streams.prototype.find = function(streamId) {
  if (!this.has(streamId)) {
    return null;
  }
  return this.list[streamId];
};

/**
 * @param {Channel} channel
 * @returns {Stream[]}
 */
Streams.prototype.findAllByChannel = function(channel) {
  return _.filter(this.list, function(stream) {
    return channel.equalTo(stream.channel);
  });
};

/**
 * @returns {Array.<Stream>}
 */
Streams.prototype.getAll = function() {
  return _.toArray(this.list);
};

/**
 * @returns {Promise}
 */
Streams.prototype.unregisterAll = function() {
  this._removeAll();
  return serviceLocator.get('cm-api-client').removeAllStreams().then(function() {
    serviceLocator.get('logger').info('Removed all streams');
  });
};

/**
 * @param {String} streamId
 * @returns {Boolean}
 */
Streams.prototype.has = function(streamId) {
  return _.has(this.list, streamId);
};

/**
 * @param {Stream} stream
 */
Streams.prototype._add = function(stream) {
  this.list[stream.id] = stream;
};

/**
 * @param {Stream} stream
 */
Streams.prototype._remove = function(stream) {
  if (this.has(stream.id)) {
    delete this.list[stream.id];
  }
};

Streams.prototype._removeAll = function() {
  this.list = {};
};

module.exports = Streams;
