var WebSocket = require('ws');

/**
 * @param {String} address
 * @constructor
 */
function JanusConnection(address) {
  this.queuedMessages = [];
  this.isWebsocketOpen = false;
  this.websocket = new WebSocket(address, 'janus-protocol');

  var self = this;
  this.websocket.on('open', function() {
    self.isWebsocketOpen = true;
    self.queuedMessages.forEach(function(message) {
      self.websocket.send(message);
    });
    self.queuedMessages = [];
  });
}

/**
 * @param {Object} message
 */
JanusConnection.prototype.send = function(message) {
  if (!this.isWebsocketOpen) {
    this.queuedMessages.push(message);
  } else {
    this.websocket.send(message);
  }
};

/**
 * @param {String} event
 * @param {Function} callback
 */
JanusConnection.prototype.on = function(event, callback) {
  this.websocket.on(event, callback);
};

JanusConnection.prototype.close = function() {
  this.websocket.removeAllListeners('message');
  this.websocket.close();
};

module.exports = JanusConnection;
