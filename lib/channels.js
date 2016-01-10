var _ = require('underscore');
var util = require('util');
var Channel = require('./channel');

function Channels() {
  this.list = {};
}

/**
 * @param {Channel} channel
 */
Channels.prototype.add = function(channel) {
  if (this.findById(channel.id)) {
    throw new Error('Channel with id `' + channel.id + '` already exists');
  }
  if (this.findByName(channel.name)) {
    throw new Error('Channel with name `' + channel.name + '` already exists');
  }
  var key = this._extractKey(channel);
  this.list[key] = channel;
};

/**
 * @param {Channel} channel
 */
Channels.prototype.remove = function(channel) {
  var key = this._extractKey(channel);
  if (!this.contains(channel)) {
    throw new Error('Channel with key `' + key + '` does not exist');
  }
  delete this.list[key];
};

/**
 * @param {String} id
 * @returns {Channel|null}
 */
Channels.prototype.findById = function(id) {
  return _.find(this.list, function(channel) {
    return channel.id === id;
  });
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

Channels.prototype.contains = function(channel) {
  var key = this._extractKey(channel);
  return _.has(this.list, key);
};

Channel.prototype._extractKey = function(channel) {
  return channel.id + ':' + channel.name;
};

module.exports = Channels;
