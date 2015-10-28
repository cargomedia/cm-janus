var WebSocketServer = require('ws').Server;
var JanusConnection = require('./janus-connection');
var Auth = require('./auth');

/**
 * @param {Number} listenPort
 * @param {String} janusAddress
 * @constructor
 */
function JanusProxy(listenPort, janusAddress) {
  this.port = listenPort;
  this.janusAddress = janusAddress;
  this._auth = new Auth();
}

JanusProxy.prototype.start = function() {
  var webSocketServer = new WebSocketServer({port: this.port});
  console.log('Websocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(browserConnection) {
    var janusConnection = new JanusConnection(this.janusAddress);
    this.proxy(browserConnection, janusConnection);
  }.bind(this));
};


JanusProxy.prototype.proxy = function(browserConnection, janusConnection) {
  var self = this;
  browserConnection.on('message', function(messageText) {
    var message = JSON.parse(messageText);
    self._auth.authorizeConnection(browserConnection, message.token).then(function() {
      janusConnection.send(messageText);
    }).catch(function() {
      browserConnection.close();
    });
  });

  browserConnection.on('close', function() {
    janusConnection.close();
  });

  janusConnection.on('message', function(data, flags) {
    if (self._auth.isValidConnection(browserConnection)) {
      console.log('from janus: ', data);
      browserConnection.send(data);
    } else {
      browserConnection.close();
    }
  });

  janusConnection.on('close', function() {
    // TODO: shall we close connectionBrowser, or recreate connectionJanus
  });

};

module.exports = JanusProxy;
