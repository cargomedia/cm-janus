var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {ProxyConnection} proxyConnection
 * @constructor
 */
function Stream(id, channelName, proxyConnection) {
  this.id = id;
  this.channelName = channelName;
  this.proxyConnection = proxyConnection;
}

/**
 * @param {String} streamChannelName
 * @param {ProxyConnection} proxyConnection
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, proxyConnection) {
  return new Stream(uuid.v4(), streamChannelName, proxyConnection);
};

module.exports = Stream;
