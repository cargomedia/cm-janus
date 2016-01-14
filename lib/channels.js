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
 * @param {String} name
 * @param {String} data
 * @returns {Channel}
 */
Channels.prototype.getByNameAndData = function(name, data) {
  var channel = this.findByNameAndData(name, data);
  if (!channel) {
    var invalidDataChannel = this.findByName(name);
    if (invalidDataChannel) {
      throw new Error('Channel with the same name `' + name + '` but different data `' + data + '` found. Data needs to be the same.');
    } else {
      throw new Error('Channel with name `' + name + '` and data `' + data + '` not found.');
    }
  }
  return channel;
};

/**
 * @param {String} name
 * @param {String} data
 * @returns {Channel|null}
 */
Channels.prototype.findByNameAndData = function(name, data) {
  return _.find(this.list, function(channel) {
    return channel.name === name && channel.data === data;
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
