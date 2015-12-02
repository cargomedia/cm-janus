var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {ProxyConnection} proxyConnection
 * @constructor
 */
function Stream(id, channelName, proxyConnection) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.channelName = channelName;

  /** @type {ProxyConnection} */
  this.proxyConnection = proxyConnection;
}

Stream.prototype.toString = function() {
  return JSON.stringify(this);
};

/**
 * @param {String} streamChannelName
 * @param {ProxyConnection} proxyConnection
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, proxyConnection) {
  return new Stream(uuid.v4(), streamChannelName, proxyConnection);
};

module.exports = Stream;
