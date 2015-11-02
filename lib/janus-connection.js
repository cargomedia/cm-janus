var Connection = require('./connection.js');
var util = require('util');

/**
 * @param {WebSocket} webSocket
 * @constructor
 */
function JanusConnection(webSocket) {
  JanusConnection.super_.call(this, 'janus', webSocket);
}

util.inherits(JanusConnection, Connection);

module.exports = JanusConnection;
