var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {ProxyConnection} proxyConnection
 * @param {Boolean} isPublish
 * @constructor
 */
function Stream(id, channelName, proxyConnection, isPublish) {
  this.id = id;
  this.channelName = channelName;
  this.proxyConnection = proxyConnection;
  this.isPublish = !!isPublish;
}

/**
 * @param {String} streamChannelName
 * @param {ProxyConnection} proxyConnection
 * @param {Boolean} isPublish
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, proxyConnection, isPublish) {
  return new Stream(uuid.v4(), streamChannelName, proxyConnection, isPublish);
};

module.exports = Stream;
