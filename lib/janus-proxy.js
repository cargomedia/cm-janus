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
    try {
      var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
      var browserConnection = new Connection('browser', incomingConnection);
      var janusConnection = new Connection('janus', outgoingConnection);
      new ProxyConnection(browserConnection, janusConnection);
    } catch (error) {
      serviceLocator.get('logger').error('Unexpected JanusProxy runtime error: ' + error);
      if (browserConnection) {
        browserConnection.close();
      }
      if (janusConnection) {
        janusConnection.close();
      }
    }
  });
};

module.exports = JanusProxy;
