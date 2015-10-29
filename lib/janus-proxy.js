var logger = require('./logger');
var Auth = require('./auth');
var WebSocketServer = require('ws').Server;
var JanusConnection = require('./janus-connection');
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

    proxyConnection.on('create', function(request, response) {
      if ('error' == response['janus']) {
        // inform cm that session couldn't be created
        return;
      }
      proxyConnection.sessionId = response['data']['id'];
    });

    proxyConnection.on('attach', function(request, response) {
      if ('error' == response['janus']) {
        // inform cm that plugin couldn't be attached
        return;
      }
      var plugin = new Plugin(response['data']['id'], request['plugin']);
      proxyConnection.attachPlugin(plugin);

      switch (plugin.name) {
        case 'janus.plugin.streaming':

          plugin.on('message', function(request) {
            var body = request['body'];
            if ('watch' == body['request']) {
              //var streamId = body['id'];
              //var streamName = plugin.id;
              //var stream = new Stream(streamName, proxyConnection.sessionId);
              // ? plugin.addStream();
            }
          });

          plugin.on('webrtcup', function(request) {
            logger.debug('webrtc is up');
            // send stream to cm-application
          });

          plugin.on('media', function(request, response) {
            // ?
          });

          plugin.on('hangup', function(request, response) {
            // send 'stream stop' to cm-app
          });

          plugin.on('detach', function() {
            if ('error' == response['janus']) {
              // inform cm that detach failed
              return;
            }
            proxyConnection.detachPlugin(plugin);
          });

          break;
      }
    });

    proxyConnection.on('destroy', function(request, response) {
      if ('error' == response['janus']) {
        // inform cm that destroy failed
        return;
      }
      proxyConnection.sessionId = null;
    });
  }.bind(this));
};

module.exports = JanusProxy;
