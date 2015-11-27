var WebSocket = require('ws');
var WebSocketConnection = require('./connection');
var JanusConnection = require('./janus/web-socket-connection');
var JanusError = require('./janus/janus-error');

var serviceLocator = require('./service-locator');

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
  serviceLocator.get('logger').debug('WebSocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(incomingConnection) {
    var browserWebSocket = new WebSocketConnection('browser', incomingConnection);
    var janusWebSocket = WebSocketConnection.open('janus', proxy.janusAddress, 'janus-protocol');
    var connection = new JanusConnection(browserWebSocket, janusWebSocket);

    var handleRejection = function(error) {
      if (!error instanceof JanusError.Error) {
        serviceLocator.get('logger').error('Unexpected error', error);
        error = new JanusError.Unknown(message['transaction']);
      }
      browserWebSocket.send(error.response);
    };

    browserWebSocket.on('message', function(request) {
      connection.processRequest(request).then(function() {
        janusWebSocket.send(request);
      }, handleRejection);
    });

    janusWebSocket.on('message', function(incoming) {
      connection.processIncoming(incoming).then(function() {
        browserWebSocket.send(request);
      }, handleRejection);
    });

    browserWebSocket.on('close', function() {
      browserWebSocket.removeAllListeners('message');
    });

    janusWebSocket.on('close', function() {
      janusWebSocket.removeAllListeners('message');
    });
  });
};

module.exports = JanusProxy;
