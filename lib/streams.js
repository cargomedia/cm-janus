var logger = require('logger');

function Streams() {
  this.list = {};
}

/**
 * @param {Stream} stream
 */
Streams.prototype.add = function(stream) {
  logger.debug('New stream: ' + stream.id + ' (for: ' + stream.channelName + ')');
  this.list[stream.id] = stream;

  var self = this;
  stream.browserConnection.on('close', function() {
    delete self.list[stream.id]
  });
};

module.exports = new Streams();
