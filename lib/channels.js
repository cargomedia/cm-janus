var _ = require('underscore');
var util = require('util');

function Channels() {
  this.list = {};
}

/**
 * @param {Channel} channel
 */
Channels.prototype.add = function(channel) {
  if (this.contains(channel)) {
    throw new Error('`' + channel + '` already exists');
  }
  this.list[channel.name] = channel;
};

/**
 * @param {Channel} channel
 */
Channels.prototype.remove = function(channel) {
  if (!this.contains(channel)) {
    throw new Error('`' + channel + '` does not exist');
  }
  delete this.list[channel.name];
};

/**
 * @param {String} name
 * @returns {Channel|null}
 */
Channels.prototype.findByName = function(name) {
  return _.find(this.list, function(channel) {
    return channel.name === name;
  });
};

/**
 * @param {Channel} channel
 * @returns {Boolean}
 */
Channels.prototype.contains = function(channel) {
  return _.has(this.list, channel.name);
};

module.exports = Channels;
