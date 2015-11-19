var Connection = require('./connection.js');
var util = require('util');

/**
 * @param {ServiceLocator} serviceLocator
 * @param {WebSocket} webSocket
 * @constructor
 */
function JanusConnection(serviceLocator, webSocket) {
  JanusConnection.super_.call(this, serviceLocator, 'janus', webSocket);
}

util.inherits(JanusConnection, Connection);

module.exports = JanusConnection;
