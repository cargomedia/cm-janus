var uuid = require('node-uuid');
var Context = require('./context');

/**
 * @param {String} id
 * @param {String} name
 * @param {String} data
 * @param {Context} [context]
 * @constructor
 */
function Channel(id, name, data, context) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.name = name;

  /** @type {String} */
  this.data = data;

  if (!context) {
    context = new Context();
  }
  /** @type {Context} */
  this.context = context.extend({channelName: this.name, channelId: this.id})
}

Channel.prototype.toString = function() {
  return 'Channel' + JSON.stringify({id: this.id, name: this.name});
};

/**
 * @returns {Object}
 */
Channel.prototype.getContext = function() {
  return this.context.toHash();
};

/**
 * @param {String} name
 * @param {String} data
 * @param {Context} context
 * @returns {Channel}
 */
Channel.generate = function(name, data, context) {
  return new Channel(uuid.v4(), name, data, context);
};

module.exports = Channel;
