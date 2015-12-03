var WebSocket = require('ws');
var uuid = require('node-uuid');

var Connection = require('./connection');
var JanusConnection = require('./proxy-connection');
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
      var browserConnection = new Connection('browser', incomingConnection);
      var janusConnection = new Connection('janus', outgoingConnection);
      var connection = new JanusConnection(uuid.v4(), browserConnection, janusConnection);
      proxy.addConnection(connection);

      var handleError = function(error) {
        if (!(error instanceof JanusError.Error)) {
          serviceLocator.get('logger').error('Unexpected error', error);
          error = new JanusError.Unknown(JanusConnection.generateTransactionId());
        }
        browserConnection.send(error.getWebSocketMessage());
        if (error instanceof JanusError.Fatal) {
          browserConnection.close();
        }
      };

      browserConnection.on('message', function(request) {
        connection.processMessage(request).then(function() {
          janusConnection.send(request);
        }, handleError);
      });

      janusConnection.on('message', function(request) {
        connection.processMessage(request).then(function() {
          browserConnection.send(request);
        }, handleError);
      });

      browserConnection.on('close', function() {
        browserConnection.removeAllListeners();
        if (janusConnection.isOpened()) {
          janusConnection.close();
        }
        proxy.removeConnection(connection);
      });

      janusConnection.on('close', function() {
        janusConnection.removeAllListeners();
        if (browserConnection.isOpened()) {
          browserConnection.close();
        }
        proxy.removeConnection(connection);
      });

      browserConnection.on('error', handleError);
      janusConnection.on('error', handleError);

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

/**
 * @returns {WebSocket.Server}
 */
JanusProxy.prototype.getWebSocketServer = function() {
  var webSocketServer = new WebSocket.Server({port: this.port});
  serviceLocator.get('logger').debug('WebSocket server on port ' + this.port + ' started');
  return webSocketServer;
};

/**
 * @param {ProxyConnection} connection
 */
JanusProxy.prototype.addConnection = function(connection) {
  this.connections[connection.id] = connection;
};

/**
 * @param {ProxyConnection} connection
 */
JanusProxy.prototype.removeConnection = function(connection) {
  if (this.connections[connection.id]) {
    connection.onRemove();
    delete this.connections[connection.id];
  }
};

module.exports = JanusProxy;
