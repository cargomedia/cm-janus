var WebSocketServer = require('ws').Server;
var JanusConnection = require('./janus-connection');

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
  var webSocketServer = new WebSocketServer({port: this.port});
  console.log('Websocket server on port ' + this.port + ' started');
  webSocketServer.on('connection', function(connectionBrowser) {

    var connectionJanus = new JanusConnection(this.janusAddress);
    console.log('Websocket connection to ' + this.janusAddress + ' started');

    connectionBrowser.on('message', function(message) {
      console.log('to janus: ', message);
      connectionJanus.send(message);
    });

    connectionJanus.on('message', function(data, flags) {
      console.log('from janus: ', data);
      connectionBrowser.send(data);
    });
  }.bind(this));
};

module.exports = JanusProxy;
