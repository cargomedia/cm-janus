var uuid = require('node-uuid');
var serviceLocator = require('./service-locator');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {PluginStreaming} plugin
 * @constructor
 */
function Stream(id, channelName, plugin) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.channelName = channelName;

  /** @type {PluginStreaming} */
  this.plugin = plugin;
}

/**
 * @param {String} streamChannelName
 * @param {PluginStreaming} plugin
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, plugin) {
  return new Stream(uuid.v4(), streamChannelName, plugin);
};

module.exports = Stream;
