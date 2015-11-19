var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');
var ProxyConnection = require('./proxy-connection');

/**
 * @param {ServiceLocator} serviceLocator
 * @param {Number} listenPort
 * @param {String} janusAddress
 * @constructor
 */
function JanusProxy(serviceLocator, listenPort, janusAddress) {
  this.serviceLocator = serviceLocator;
  this.port = listenPort;
  this.janusAddress = janusAddress;
}

JanusProxy.prototype.start = function() {
  var proxy = this;
  var webSocketServer = new WebSocket.Server({port: this.port});
  this.serviceLocator.get('logger').debug('WebSocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(incomingConnection) {
    var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
    var browserConnection = new BrowserConnection(proxy.serviceLocator, incomingConnection);
    var janusConnection = new JanusConnection(proxy.serviceLocator, outgoingConnection);
    var proxyConnection = new ProxyConnection(proxy.serviceLocator, browserConnection, janusConnection);

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
