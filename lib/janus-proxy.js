var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');
var Plugin = require('./plugin');
var Stream = require('./stream');
var CMApiClient = require('./cm-api-client');

var config = require('config');
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
  var apiClient  = new CMApiClient(config.get('cmApi.baseUrl'));
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
      switch (plugin.name) {
        case 'janus.video.streaming':
          if ('message' === request.janus && 'create' === request.body.event) {
            auth.canPublish(request.session_id).then(function() {
              janusConnection.send(request).then(function(response) {
                plugin.data.stream = Stream.generate(request.body.id, browserConnection);
                streams.add(plugin.data.stream);
              });
            });
            return;
          }

          if ('message' === request.janus && 'watch' === request.body.event) {
            auth.canSubscribe(request.session_id).then(function() {
              janusConnection.send(request).then(function(response) {
                plugin.data.stream = Stream.generate(request.body.id, browserConnection);
                streams.add(plugin.data.stream);
              });
            });
            return;
          }
          break;
      }

      janusConnection.send(request);
    });

    janusConnection.on('plugin', function(plugin, request) {
      switch (plugin.name) {
        case 'janus.video.streaming':
          if ('webrtcup' === request.janus) {
            apiClient.subscribe(plugin.data.stream.channelName, plugin.data.stream.id, timestamp());
          }

          if ('hangup' === request.janus) {
            apiClient.removeStream(plugin.data.stream.channelName, plugin.data.stream.id);
          }
          break;
      }

      browserConnection.send(request);
    })
  });
};

JanusProxy.prototype.isAllowedPlugin = function(plugin) {
  return true;
};

module.exports = JanusProxy;
