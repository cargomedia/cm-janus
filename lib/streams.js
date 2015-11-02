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
 * @param {BrowserConnection} connection
 * @returns {Array<Stream>}
 */
Streams.prototype.findAllByConnection = function(connection) {
  return _.filter(this.list, function(stream) {
    return stream.connection === connection;
  });
};

module.exports = new Streams();
