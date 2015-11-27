var WebSocket = require('ws');
var Connection = require('./connection');
var ProxyConnection = require('./proxy-connection');

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

    browserConnection.on('message', function(request) {
      proxyConnection.processMessage(request).then(function() {
        janusConnection.send(request);
      });
    });

    janusConnection.on('message', function(request) {
      proxyConnection.processMessage(request).then(function() {
        browserConnection.send(request);
      });
    });

    browserConnection.on('close', function() {
      proxyConnection.close();
    });

    janusConnection.on('close', function() {
      proxyConnection.close();
    });
  });
};

module.exports = JanusProxy;
