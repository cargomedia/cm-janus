var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events');
var Stream = require('./stream');
var ProxyConnection = require('./proxy-connection');

function Streams() {
  this.list = {};
}

util.inherits(Streams, EventEmitter);

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
  if (!this.list[stream.id]) {
    throw new Error('Stream with id `' + stream.id + '` does not exist');
  }
  delete this.list[stream.id];
  this.emit('remove', stream);
};

/**
 * @param {String} streamId
 * @returns {Stream|null}
 */
Streams.prototype.find = function(streamId) {
  return this.list[streamId] || null;
};

/**
 * @param {ProxyConnection} proxyConnection
 * @returns {Array<Stream>}
 */
Streams.prototype.findAllByConnection = function(proxyConnection) {
  if (!(proxyConnection instanceof ProxyConnection)) {
    throw new Error('Must be instance of `ProxyConnection`');
  }
  return _.filter(this.list, function(stream) {
    return stream.proxyConnection === proxyConnection;
  });
};

module.exports = Streams;
