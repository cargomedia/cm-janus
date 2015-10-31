var Connection  = require('./connection.js');
var util = require('util');

/**
 * @param {WebSocket} webSocket
 * @constructor
 */
function JanusConnection(webSocket) {
  JanusConnection.super_.call(this, webSocket);
  this.identifier = 'janus';
}

util.inherits(JanusConnection, Connection);

module.exports = JanusConnection;
