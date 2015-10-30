var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Plugin(id, name) {
  this.id = id;
  this.name = name;
}

util.inherits(Plugin, EventEmitter);

module.exports = Plugin;
