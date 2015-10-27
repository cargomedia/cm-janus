var WebSocket = require('ws');

function JanusProxy() {
  //TODO config
}

JanusProxy.prototype.connect = function() {
  this._instance = new WebSocket.Server({port: 8188});

  var ws = new WebSocket('ws://198.23.87.26:8188/janus', 'janus-protocol');
  this._ws = ws;
  var self = this;
  ws.on('open', function() {
    self._instance.on('connection', self._createConnection.bind(self));
  });
};

JanusProxy.prototype._createConnection = function(connection) {
  var self = this;
  //var ws = new WebSocket('ws://198.23.87.26:8188/janus', 'janus-protocol');
  //self._ws = ws;

  //connection.on('message', queueMessage);

  //ws.on('open', function() {

    self._ws.on('message', function(data, flags) {
      console.log('outcoming from janus: ', data);
      connection.send(data);
    });
    connection.on('message', function(message){
      console.log('incoming to janus: ', message);
      self._ws.send(message);
    });
  //});

  //connection.on('message', this._onmessage.bind(this, connection));
};

JanusProxy.prototype._onmessage = function(connection, message) {
  console.log('###', connection);
};

module.exports = JanusProxy;
