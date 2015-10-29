var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Plugin(id, type) {
  this.id = id;
  this.type = type;
}

util.inherits(Plugin, EventEmitter);

module.exports = Plugin;
