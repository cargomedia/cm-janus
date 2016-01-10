var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} channelName
 * @param {String} channelData
 * @param {PluginAbstract} plugin
 * @constructor
 */
function Stream(id, channelName, channelData, plugin) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.channelName = channelName;

  /** @type {String} */
  this.channelData = channelData;

  /** @type {PluginAbstract} */
  this.plugin = plugin;

  /** @type {Date} */
  this.start = new Date();
}

Stream.prototype.toString = function() {
  return 'Stream' + JSON.stringify({id: this.id});
};

/**
 * @param {String} channelName
 * @param {String} channelData
 * @param {PluginAbstract} plugin
 * @returns {Stream}
 */
Stream.generate = function(channelName, channelData, plugin) {
  return new Stream(uuid.v4(), channelName, channelData, plugin);
};

module.exports = Stream;
