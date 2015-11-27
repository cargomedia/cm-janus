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
  this._connections = {};
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
      proxy._addConnection(proxyConnection);
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
    this._stopConnection(proxyConnection);
    return proxyConnection.close();
  }.bind(this));
  return Promise.resolve();
};

/**
 * @param {ProxyConnection} proxyConnection
 */
JanusProxy.prototype._addConnection = function(proxyConnection) {
  var closeListener = this._removeConnection.bind(this);
  this._connections[proxyConnection.id] = closeListener;
  proxyConnection.on('close', closeListener);
};

/**
 * @param {ProxyConnection} proxyConnection
 */
JanusProxy.prototype._removeConnection = function(proxyConnection) {
  delete this._connections[proxyConnection.id];
};

/**
 * @param {ProxyConnection} proxyConnection
 */
JanusProxy.prototype._stopConnection = function(proxyConnection) {
  var closeListener = this._connections[proxyConnection.id];
  proxyConnection.removeListener('close', closeListener);
  this._removeConnection(proxyConnection);
};

module.exports = JanusProxy;
