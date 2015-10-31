var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');

var logger = require('./logger');
var auth = require('./auth');

/**
 * @param {Number} listenPort
 * @param {String} janusAddress
 * @constructor
 */
function JanusProxy(listenPort, janusAddress) {
  this.port = listenPort;
  this.janusAddress = janusAddress;
}

JanusProxy.prototype.start = function() {
  var proxy = this;
  var webSocketServer = new WebSocket.Server({port: this.port});
  logger.debug('WebSocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(incomingConnection) {
    var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
    var browserConnection = new BrowserConnection(incomingConnection);
    var janusConnection = new JanusConnection(outgoingConnection);

    browserConnection.on('message', function(request) {
      janusConnection.send(request);
    });

    janusConnection.on('message', function(request) {
      browserConnection.send(request);
    });
  });
};

module.exports = JanusProxy;
