var WebSocket = require('ws');
var Connection = require('./connection');
var JanusConnection = require('./proxy-connection');
var JanusError = require('./janus-error');

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
    var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
    var browserConnection = new Connection(incomingConnection);
    var janusConnection = new (outgoingConnection);
    var proxyConnection = new JanusConnection(browserConnection, janusConnection);

    var handleRejection = function(error) {
      if (!error instanceof JanusError.Error) {
        serviceLocator.get('logger').error('Unexpected error', error);
        error = new JanusError.Unknown(message['transaction']);
      }
      browserConnection.send(error.response);
    };

    browserConnection.on('message', function(request) {
      proxyConnection.processRequest(request).then(function() {
        janusConnection.send(request);
      }, handleRejection);
    });

    janusConnection.on('message', function(incoming) {
      proxyConnection.processIncoming(incoming).then(function() {
        browserConnection.send(request);
      }, handleRejection);
    });

    browserConnection.on('close', function() {
      browserConnection.removeAllListeners('message');
    });

    janusConnection.on('close', function() {
      janusConnection.removeAllListeners('message');
    });
  });
};

module.exports = JanusProxy;
