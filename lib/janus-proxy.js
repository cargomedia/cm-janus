var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');
var Stream = require('./stream');
var cmApiClient = require('./cm-api-client');
var ProxyConnection = require('./proxy-connection');

var config = require('./config');
var logger = require('./logger');
var auth = require('./auth');
var streams = require('./streams');

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
      janusConnection.removeAllListeners();
      janusConnection.close();
      streams.findAllByConnection(browserConnection).forEach(function(stream) {
        streams.remove(stream);
        logger.info('removing stream', stream);
        cmApiClient.removeStream(stream.channelName, stream.id);
      });
    });
  });
};

JanusProxy.prototype.isAllowedPlugin = function(plugin) {
  return true;
};

module.exports = JanusProxy;
