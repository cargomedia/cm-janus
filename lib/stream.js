var uuid = require('uuid');
var Context = require('./context');

/**
 * @param {String} id
 * @param {Channel} channel
 * @param {PluginAbstract} plugin
 * @constructor
 */
function Stream(id, channel, plugin) {

  /** @type {String} */
  this.id = id;

  /** @type {Channel} */
  this.channel = channel;

  /** @type {PluginAbstract} */
  this.plugin = plugin;

  /** @type {Date} */
  this.start = new Date();
}

Stream.prototype.toString = function() {
  return 'Stream' + JSON.stringify({id: this.id});
};

/**
 * @returns {Context}
 */
Stream.prototype.getContext = function() {
  var context = new Context({janus: {streamId: this.id}});
  if (this.channel) {
    context.merge(this.channel.getContext());
  }
  if (this.plugin) {
    context.merge(this.plugin.getContext());
  }
  return context;
};

/**
 * @param {Channel} channel
 * @param {PluginAbstract} plugin
 * @returns {Stream}
 */
Stream.generate = function(channel, plugin) {
  return new Stream(uuid.v4(), channel, plugin);
};

module.exports = Stream;
