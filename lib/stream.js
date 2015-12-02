var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {PluginAbstract} plugin
 * @constructor
 */
function Stream(id, channelName, plugin) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.channelName = channelName;

  /** @type {PluginAbstract} */
  this.plugin = plugin;
}

/**
 * @param {String} streamChannelName
 * @param {PluginAbstract} plugin
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, plugin) {
  return new Stream(uuid.v4(), streamChannelName, plugin);
};

module.exports = Stream;
