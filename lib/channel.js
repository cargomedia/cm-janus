var uuid = require('node-uuid');

/**
 * @param {String} id
 * @param {String} name
 * @param {String} data
 * @constructor
 */
function Channel(id, name, data) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.name = name;

  /** @type {String} */
  this.data = data;
}

Channel.prototype.toString = function() {
  return 'Channel' + JSON.stringify({id: this.id, name: this.name});
};

/**
 * @param {String} name
 * @param {String} data
 * @returns {Channel}
 */
Channel.generate = function(name, data) {
  return new Channel(uuid.v4(), name, data);
};

module.exports = Channel;
