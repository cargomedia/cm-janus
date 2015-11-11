var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');
var ProxyConnection = require('./proxy-connection');

var services = require('./services')
var logger = services.get('logger');

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
