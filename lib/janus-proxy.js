var logger = require('./logger');
var Auth = require('./auth');
var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');

/**
 * @param {Number} listenPort
 * @param {String} janusAddress
 * @constructor
 */
function JanusProxy(listenPort, janusAddress) {
  this.port = listenPort;
  this.janusAddress = janusAddress;
  this.auth = new Auth();
}

JanusProxy.prototype.start = function() {
  var proxy = this;
  var webSocketServer = new WebSocket.Server({port: this.port});
  logger.debug('WebSocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(incomingConnection) {
    var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
    var browserConnection = new BrowserConnection(incomingConnection);
    var janusConnection = new JanusConnection(outgoingConnection);

    browserConnection.on('unhandledMessage', function(message) {
      janusConnection.send(message);
    });

    janusConnection.on('unhandledMessage', function(message) {
      browserConnection.send(message);
    });
  });
};

module.exports = JanusProxy;
