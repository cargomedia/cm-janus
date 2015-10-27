var ws = require('ws');
var JanusClient = require('./janus-client');

function WebsocketServer() {
  this._janusClient = new JanusClient();
  var self = this;
  this._janusClient.connect().then(function() {
    self._instance = new ws.Server({port: 8188});
    self._instance.on('connection', self._newConnection.bind(self));
  });
}


WebsocketServer.prototype._newConnection = function(connection) {
  var self = this;
  connection.on('message', function incoming(text) {
    var message = JSON.parse(text);
    switch (message.type) {
      case 'subscribe':
        var streamId = +message.streamId;
        self._janusClient.subscribeToVideo(streamId).then(function(result) {
          var response = {type: 'subscribe', result: result.jsep};
          connection.send(JSON.stringify(response));
        });
        break;
      case 'answer':
        self._janusClient.startVideo(message.jsep);
        break;
      case 'icecandidate':
        self._janusClient.addIceCandidate(message.candidate);
        break;
    }
    console.log('received: %s', text);
  });
};

module.exports = WebsocketServer;
