var logger = require('./logger').getLogger();
var Auth = require('./auth');
var WebSocketServer = require('ws').Server;
var JanusConnection = require('./janus-connection');
var Stream = require('./proxy-connection');
var Plugin = require('./plugin');
var ProxyConnection = require('./proxy-connection');

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
  var webSocketServer = new WebSocketServer({port: this.port});
  logger.debug('Websocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(browserConnection) {
    var janusConnection = new JanusConnection(this.janusAddress);

    var proxyConnection = new ProxyConnection(browserConnection, janusConnection, this.auth);
    proxyConnection.enableProxy();

    proxyConnection.on('attach', function(request, response) {
      var plugin = new Plugin(response.data.id, request.plugin);
      proxyConnection.attachPlugin(plugin);

      switch (request.plugin) {
        case 'janus.plugin.streaming':
          var streamName = plugin.id;
          var stream = new Stream(streamName, proxyConnection.sessionId);

          plugin.on('webrtcup', function(request) {
            logger.debug('webrtc is up');
            // send stream to cm-application
          });
          break;
      }
    });
  }.bind(this));
};

module.exports = JanusProxy;
