var Connection = require('./connection.js');
var JanusError = require('./janus-error');
var util = require('util');

var serviceLocator = require('./service-locator');


function BrowserConnection(webSocket) {
  BrowserConnection.super_.call(this, 'browser', webSocket);
}

util.inherits(BrowserConnection, Connection);

module.exports = BrowserConnection;
