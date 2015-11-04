var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events');

function Streams() {
  this.list = {};
}

util.inherits(Streams, EventEmitter);

/**
 * @param {Stream} stream
 */
Streams.prototype.add = function(stream) {
  this.list[stream.id] = stream;
};

/**
 * @param {Stream} stream
 */
Streams.prototype.remove = function(stream) {
  delete this.list[stream.id];
  this.emit('remove', stream.id);
};

/**
 * @param {String} streamId
 * @returns {Stream|null}
 */
Streams.prototype.find = function(streamId) {
  return this.list[streamId];
};

/**
 * @param {ProxyConnection} proxyConnection
 * @returns {Array<Stream>}
 */
Streams.prototype.findAllByConnection = function(proxyConnection) {
  return _.filter(this.list, function(stream) {
    return stream.proxyConnection === proxyConnection;
  });
};

module.exports = new Streams();
