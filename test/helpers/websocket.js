require('mock-socket');
var util = require('util');
var EventEmitter = require('events');

function WebSocketClient(url) {
  this._webSocket = new MockWebSocket(url);

  this._webSocket.onmessage = function(data) {
    this.emit('message', data.data);
  }.bind(this);

  this._webSocket.onclose = function() {
    this.readyState = this._webSocket.readyState;
    this.emit('close');
  }.bind(this);

  this._webSocket.onopen = function() {
    this.readyState = this._webSocket.readyState;
    this.emit('open');
  }.bind(this);

  this.readyState = this._webSocket.readyState;

}

util.inherits(WebSocketClient, EventEmitter);

WebSocketClient.prototype.send = function(message) {
  this._webSocket.send(message);
};

WebSocketClient.prototype.close = function() {
  this._webSocket.close();
};

module.exports = {
  Server: MockServer,
  Client: WebSocketClient
};
