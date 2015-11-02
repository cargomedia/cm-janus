var uuid = require('node-uuid')

/**
 * @param {String} id
 * @param {String} streamChannelName
 * @param {BrowserConnection} browserConnection
 * @constructor
 */
function Stream(id, streamChannelName, browserConnection) {
  this.id = id;
  this.channelName = streamChannelName;
  this.browserConnection = browserConnection;
}

/**
 * @param {String} streamChannelName
 * @param {BrowserConnection} browserConnection
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, browserConnection) {
  return new Stream(uuid.v4(), streamChannelName, browserConnection);
};

module.exports = Stream;
