var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');
var Plugin = require('./plugin');

var logger = require('./logger');
var auth = require('./auth');

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
    var plugins = {};
    var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
    var browserConnection = new BrowserConnection(incomingConnection);
    var janusConnection = new JanusConnection(outgoingConnection);

    browserConnection.on('global', function(request) {

      if (request['handle_id']) {
        var plugin = plugins[request['handle_id']];
        browserConnection.emit('plugin', plugin, request);
        return;
      }

      if ('attach' === request.janus) {
        if (!proxy.isAllowedPlugin(request['plugin'])) {
          logger.warn('Disallowed plugin: ' + request['plugin']);
          return;
        }

        janusConnection.send(request).then(function(response) {
          var plugin = new Plugin(response.data.id, request['plugin']);
          plugins[plugin.id] = plugin;
        });
        return;
      }

      if ('detach' === request.janus) {
        janusConnection.send(request).then(function(response) {
          delete plugins[response.sender];
        });
        return;
      }

      janusConnection.send(request);
    });

    janusConnection.on('global', function(request) {
      if (request['sender']) {
        var plugin = plugins[request['sender']];
        browserConnection.emit('plugin', plugin, request);
        return;
      }

      browserConnection.send(request);
    });

    browserConnection.on('plugin', function(plugin, request) {
      janusConnection.send(request);
    });

    janusConnection.on('plugin', function(plugin, request) {
      browserConnection.send(request);
    })
  });
};

JanusProxy.prototype.isAllowedPlugin = function(plugin) {
  return true;
};

module.exports = JanusProxy;
