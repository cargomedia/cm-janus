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
}

JanusProxy.prototype.start = function() {
  var auth = new Auth();
  var webSocketServer = new WebSocketServer({port: this.port});
  console.log('Websocket server on port ' + this.port + ' started');

  webSocketServer.on('connection', function(connectionBrowser) {

    var connectionJanus = new JanusConnection(this.janusAddress);
    console.log('Websocket connection to ' + this.janusAddress + ' started');

    connectionBrowser.on('message', function(message) {
      auth.authorizeConnection(connectionBrowser, message.token).then(function() {
        connectionJanus.send(message);
      }).catch(function() {
        connectionBrowser.close();
      });
    });

    connectionBrowser.on('close', function() {
      connectionJanus.close();
    });

    connectionJanus.on('message', function(data, flags) {
      if (auth.isValidConnection(connectionBrowser)) {
        console.log('from janus: ', data);
        connectionBrowser.send(data);
      } else {
        connectionBrowser.close();
      }
    });

    connectionJanus.on('close', function() {
      // TODO: shall we close connectionBrowser, or recreate connectionJanus
    });
  }.bind(this));
};

module.exports = JanusProxy;
