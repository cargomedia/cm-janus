var _ = require('underscore');
var Promise = require('bluebird');
var WebSocket = require('ws');
var JanusConnection = require('./janus-connection');
var BrowserConnection = require('./browser-connection');
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
  this._connections = [];
}

JanusProxy.prototype.start = function() {
  var proxy = this;
  var webSocketServer = new WebSocket.Server({port: this.port});
  serviceLocator.get('logger').debug('WebSocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(incomingConnection) {
    try {
      var outgoingConnection = new WebSocket(proxy.janusAddress, 'janus-protocol');
      var browserConnection = new BrowserConnection(incomingConnection);
      var janusConnection = new JanusConnection(outgoingConnection);
      var proxyConnection = new ProxyConnection(browserConnection, janusConnection);
      proxy._connections.push(proxyConnection);
      proxyConnection.on('close', function() {
        proxy._connections = _.without(proxy._connections, proxyConnection);
      });

      browserConnection.on('message', function(request) {
        proxyConnection.processMessage(request).then(function() {
          janusConnection.send(request);
        })
      });

      janusConnection.on('message', function(request) {
        proxyConnection.processMessage(request).then(function() {
          browserConnection.send(request);
        })
      });

      function closeProxy() {
        proxyConnection.close();
      }

      function closeProxyOnError(error) {
        proxyConnection.closeOnError(error);
      }

      browserConnection.on('close', closeProxy);
      browserConnection.on('error', closeProxyOnError);
      janusConnection.on('close', closeProxy);
      janusConnection.on('error', closeProxyOnError);
    } catch (error) {
      serviceLocator.get('logger').error('Unexpected JanusProxy runtime error: ' + error);
      if (proxyConnection) {
        proxyConnection.close();
      }
    }
  });
};

/**
 * @returns {Promise}
 */
JanusProxy.prototype.stop = function() {
  this._connections.forEach(function(proxyConnection) {
    //TODO remove here onclose from 'start'
    return proxyConnection.close();
  });
  return Promise.resolve();
};

module.exports = JanusProxy;
