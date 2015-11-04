var _ = require('underscore');

function Streams() {
  this.list = {};
}

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
};

/**
 * @param {String} streamId
 * @returns {Stream|null}
 */
Streams.prototype.get = function(streamId) {
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
