var WebSocket = require('ws');
var uuid = require('node-uuid');

var Connection = require('./connection');
var JanusConnection = require('./janus/connection');
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
  this.connections = {};
}

JanusProxy.prototype.start = function() {
  var proxy = this;
  var webSocketServer = this.getWebSocketServer();

  webSocketServer.on('connection', function(incomingConnection) {
    try {
      var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
      var fromBrowserConnection = new Connection('browser', incomingConnection);
      var toJanusConnection = new Connection('janus', outgoingConnection);
      var connection = new JanusConnection(uuid.v4(), fromBrowserConnection, toJanusConnection);
      proxy.addConnection(connection);

      var handleError = function(error) {
        if (!(error instanceof JanusError.Error)) {
          serviceLocator.get('logger').error('Unexpected error', error);
          error = new JanusError.Unknown(JanusConnection.generateTransactionId());
        }
        fromBrowserConnection.send(error.getWebSocketMessage());
        if (error instanceof JanusError.Fatal) {
          fromBrowserConnection.close();
        }
      };

      fromBrowserConnection.on('message', function(request) {
        connection.processMessage(request).then(function() {
          toJanusConnection.send(request);
        }, handleError);
      });

      toJanusConnection.on('message', function(request) {
        connection.processMessage(request).then(function() {
          fromBrowserConnection.send(request);
        }, handleError);
      });

      fromBrowserConnection.on('close', function() {
        fromBrowserConnection.removeAllListeners();
        if (toJanusConnection.isOpened()) {
          toJanusConnection.close();
        }
        proxy.removeConnection(connection);
      });

      toJanusConnection.on('close', function() {
        toJanusConnection.removeAllListeners();
        if (fromBrowserConnection.isOpened()) {
          fromBrowserConnection.close();
        }
        proxy.removeConnection(connection);
      });

      fromBrowserConnection.on('error', handleError);
      toJanusConnection.on('error', handleError);

    } catch (error) {
      serviceLocator.get('logger').error('Unexpected JanusProxy runtime error: ' + error);
      if (fromBrowserConnection) {
        fromBrowserConnection.close();
      }
      if (toJanusConnection) {
        toJanusConnection.close();
      }
    }
  });
};

/**
 * @returns {WebSocket.Server}
 */
JanusProxy.prototype.getWebSocketServer = function() {
  var webSocketServer = new WebSocket.Server({port: this.port});
  serviceLocator.get('logger').debug('WebSocket server on port ' + this.port + ' started');
  return webSocketServer;
};

/**
 * @param {JanusConnection} connection
 */
JanusProxy.prototype.addConnection = function(connection) {
  this.connections[connection.id] = connection;
};

/**
 * @param {JanusConnection} connection
 */
JanusProxy.prototype.removeConnection = function(connection) {
  if (this.connections[connection.id]) {
    connection.onRemove();
    delete this.connections[connection.id];
  }
};

module.exports = JanusProxy;
