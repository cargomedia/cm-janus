var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {PluginAbstract} plugin
 * @param {String} channelData
 * @constructor
 */
function Stream(id, channelName, plugin, channelData) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.channelName = channelName;

  /** @type {PluginAbstract} */
  this.plugin = plugin;

  /** @type {String} */
  this.channelData = channelData;
}

Stream.prototype.toString = function() {
  return 'Stream' + JSON.stringify({id: this.id});
};

/**
 * @param {String} streamChannelName
 * @param {PluginAbstract} plugin
 * @param {String} channelData
 * @returns {Stream}
 */
Stream.generate = function(streamChannelName, plugin, channelData) {
  return new Stream(uuid.v4(), streamChannelName, plugin, channelData);
};

module.exports = Stream;
