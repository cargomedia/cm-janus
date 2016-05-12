var _ = require('underscore');
var url = require('url');
var http = require('http');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;
var uuid = require('node-uuid');
var Promise = require('bluebird');

var Context = require('../context');
var Connection = require('../connection');
var JanusConnection = require('./connection');
var JanusError = require('./error');
var serviceLocator = require('./../service-locator');

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

/**
 * @returns {Promise}
 */
JanusProxy.prototype.start = function() {
  var proxy = this;
  return serviceLocator.get('streams').removeAll()
    .catch(function(error) {
      serviceLocator.get('logger').warn('Can\'t remove streams on startup', new Context({exception: error}));
    })
    .then(function() {
      var webSocketServer = proxy.getWebSocketServer();
      webSocketServer.on('connection', function(incomingConnection) {
        var location = url.parse(incomingConnection.upgradeReq.url, true);
        switch (location.path) {
          case '/edge':
            serviceLocator.get('cluster').getEdgeAddress()
              .then(function(edgeAddress) {
                proxy._wrapIntoConnections(edgeAddress.webSocketAddress, incomingConnection);
              });
            break;
          case '/origin':
            proxy._wrapIntoConnections(proxy.janusAddress, incomingConnection);
            break;
        }
      });
    });
};

JanusProxy.prototype._wrapIntoConnections = function(outgoingAddress, incomingConnection) {
  try {
    var outgoingConnection = new WebSocketClient(outgoingAddress, 'janus-protocol');
    var fromClientConnection = new Connection('browser', incomingConnection);
    var toJanusConnection = new Connection('janus', outgoingConnection);
    this.establishConnection(fromClientConnection, toJanusConnection);
  } catch (error) {
    serviceLocator.get('logger').error('Unexpected JanusProxy runtime error', new Context({exception: error}));
    if (fromClientConnection) {
      fromClientConnection.close();
    }
    if (toJanusConnection) {
      toJanusConnection.close();
    }
  }
};

/**
 * @param {Connection} fromClientConnection
 * @param {Connection} toJanusConnection
 * @returns {JanusConnection}
 */
JanusProxy.prototype.createConnection = function(fromClientConnection, toJanusConnection) {
  return new JanusConnection(uuid.v4(), fromClientConnection, toJanusConnection);
};

/**
 * @param {Connection} fromClientConnection
 * @param {Connection} toJanusConnection
 * @returns {JanusConnection}
 */
JanusProxy.prototype.establishConnection = function(fromClientConnection, toJanusConnection) {
  var proxy = this;
  var connection = proxy.createConnection(fromClientConnection, toJanusConnection);
  proxy.addConnection(connection);

  var handleError = function(error, transaction) {
    proxy.handleError(error, fromClientConnection, transaction);
  };

  fromClientConnection.on('message', function(request) {
    serviceLocator.get('logger').debug('proxying browser -> janus', connection.getContext().extend({janus: {request: request}}));
    connection.processMessage(request)
      .then(function(processedRequest) {
        toJanusConnection.send(processedRequest);
      })
      .catch(function(error) {
        handleError(error, request['transaction']);
      });
  });

  toJanusConnection.on('message', function(request) {
    serviceLocator.get('logger').debug('proxying janus -> browser', connection.getContext().extend({janus: {request: request}}));
    connection.processMessage(request)
      .then(function(processedRequest) {
        fromClientConnection.send(processedRequest);
      })
      .catch(function(error) {
        handleError(error, request ? request['transaction'] : null);
      });
  });

  fromClientConnection.on('close', function() {
    fromClientConnection.removeAllListeners();
    if (toJanusConnection.isOpened()) {
      toJanusConnection.close();
    }
    proxy.removeConnection(connection);
  });

  toJanusConnection.on('close', function() {
    toJanusConnection.removeAllListeners();
    if (fromClientConnection.isOpened()) {
      fromClientConnection.close();
    }
    proxy.removeConnection(connection);
  });

  fromClientConnection.on('error', handleError);
  toJanusConnection.on('error', handleError);

  return connection;
};

/**
 * @param {Error} error
 * @param {Connection} fromClientConnection
 * @param {String} [transaction]
 */
JanusProxy.prototype.handleError = function(error, fromClientConnection, transaction) {
  var context = new Context({exception: error});
  if (error instanceof JanusError.Fatal || !(error instanceof JanusError.Error)) {
    serviceLocator.get('logger').error('Unexpected proxy error. Closing proxy connection.', context);
    fromClientConnection.close();
  } else {
    serviceLocator.get('logger').error('Proxy error', context);
    var errorMessage = {
      janus: 'error',
      error: {
        code: error.code || 490,
        reason: error.message
      }
    };
    if (transaction) {
      errorMessage.transaction = transaction;
    }
    fromClientConnection.send(errorMessage).catch(function(error) {
      serviceLocator.get('logger').warn('Could not send an error janus message to client', new Context({errorMessage: errorMessage, exception: error}));
    });
  }
};

/**
 * @returns {WebSocketServer}
 */
JanusProxy.prototype.getWebSocketServer = function() {
  var server = http.createServer(function(request, response) {
    response.writeHead(404);
    response.end();
  });
  var webSocketServer = new WebSocketServer({server: server});
  server.listen(this.port);

  serviceLocator.get('logger').debug('WebSocket server on port ' + this.port + ' started');
  return webSocketServer;
};

/**
 * @param {JanusConnection} connection
 */
JanusProxy.prototype.addConnection = function(connection) {
  this.connections[connection.id] = connection;
  serviceLocator.get('logger').info('Added connection', connection.getContext());
};

/**
 * @param {JanusConnection} connection
 */
JanusProxy.prototype.removeConnection = function(connection) {
  if (this.connections[connection.id]) {
    return connection.onRemove().then(function() {
      delete this.connections[connection.id];
    }.bind(this));
  }
  return Promise.resolve();
};

/**
 * @returns {Promise}
 */
JanusProxy.prototype.stop = function() {
  return Promise.all(
    _.map(this.connections, function(connection) {
      return this.removeConnection(connection).reflect();
    }.bind(this)));
};

module.exports = JanusProxy;
