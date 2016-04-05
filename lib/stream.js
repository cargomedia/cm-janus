var uuid = require('node-uuid');
var Context = require('./context');

/**
 * @param {String} id
 * @param {Channel} channel
 * @param {PluginAbstract} plugin
 * @param {Context} [context]
 * @constructor
 */
function Stream(id, channel, plugin, context) {

  /** @type {String} */
  this.id = id;

  /** @type {Channel} */
  this.channel = channel;

  /** @type {PluginAbstract} */
  this.plugin = plugin;

  if (!context) {
    context = new Context();
  }
  /** @type {Context} */
  this.context = context.extend({streamId: this.id});

  /** @type {Date} */
  this.start = new Date();
}

Stream.prototype.toString = function() {
  return 'Stream' + JSON.stringify({id: this.id});
};

/**
 * @returns {Object}
 */
Stream.prototype.getContext = function() {
  return this.context.toHash();
};

/**
 * @param {Channel} channel
 * @param {PluginAbstract} plugin
 * @param {Context} context
 * @returns {Stream}
 */
Stream.generate = function(channel, plugin, context) {
  return new Stream(uuid.v4(), channel, plugin, context);
};

module.exports = Stream;
