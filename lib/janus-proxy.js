var WebSocket = require('ws');
var Connection = require('./connection');
var ProxyConnection = require('./proxy-connection');
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
    var browserConnection = new Connection(incomingConnection);
    var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
    var janusConnection = new Connection(outgoingConnection);
    var proxyConnection = new ProxyConnection(browserConnection, janusConnection);

    var handleError = function(error) {
      if (!error instanceof JanusError.Error) {
        serviceLocator.get('logger').error('Unexpected error', error);
        error = new JanusError.Unknown(message['transaction']);
      }
      browserConnection.send(error.response);
    };

    browserConnection.on('message', function(request) {
      proxyConnection.processMessage(request).then(function() {
        janusConnection.send(request);
      }, handleError);
    });

    janusConnection.on('message', function(request) {
      proxyConnection.processMessage(request).then(function() {
        browserConnection.send(request);
      }, handleError);
    });

    browserConnection.on('close', function() {
      browserConnection.removeAllListeners('message');
      if (janusConnection.isOpened()) {
        janusConnection.close()
      }
    });

    janusConnection.on('close', function() {
      janusConnection.removeAllListeners('message');
      if (browserConnection.isOpened()) {
        browserConnection.close();
      }
    });
  });
};

module.exports = JanusProxy;
