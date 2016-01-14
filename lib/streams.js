var _ = require('underscore');
var util = require('util');
var Stream = require('./stream');

function Streams() {
  this.list = {};
}

/**
 * @param {Stream} stream
 */
Streams.prototype.add = function(stream) {
  if (!(stream instanceof Stream)) {
    throw new Error('Must be instance of `Stream`');
  }
  this.list[stream.id] = stream;
};

/**
 * @param {Stream} stream
 */
Streams.prototype.remove = function(stream) {
  if (!this.has(stream.id)) {
    throw new Error('Stream with id `' + stream.id + '` does not exist');
  }
  delete this.list[stream.id];
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
 * @param {String} streamId
 * @returns {Boolean}
 */
Streams.prototype.has = function(streamId) {
  return _.has(this.list, streamId);
};

/**
 * @param {Channel} channel
 * @returns {Stream<Array>}
 */
Streams.prototype.findByChannel = function(channel) {
  return _.find(this.list, function(stream) {
    return channel === stream.channel;
  });
};

module.exports = Streams;
