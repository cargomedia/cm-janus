var Connection  = require('./connection.js');
var util = require('util');

function BrowserConnection(webSocket) {
  BrowserConnection.super_.call(this, webSocket);
  this.identifier = 'browser';
}

util.inherits(BrowserConnection, Connection);

module.exports = BrowserConnection;
