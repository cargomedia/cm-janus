var assert = require('chai').assert;
var WebSocketServer = require('../helpers/websocket').Server;
var WebSocket = require('../helpers/websocket').Client;

var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');
serviceLocator.register('logger', function() {
  return new Logger();
});

var Connection = require('../../lib/connection');

describe('Connection Unit tests', function() {

  this.timeout(2000);

  beforeEach(function() {
    this.webSocketServer = new WebSocketServer('ws://localhost:8080');
    this.webSocket = new WebSocket('ws://localhost:8080');
    this.connection = new Connection('test', this.webSocket);
    this.sampleMessage = {test: 'test'};
  });

  afterEach(function() {
    this.webSocketServer.close();
    this.connection.close();
  });

  it('send', function(done) {
    var self = this;
    this.webSocketServer.on('message', function(message) {
      assert.strictEqual(message, JSON.stringify(self.sampleMessage));
      done();
    });
    this.connection.send(this.sampleMessage);
  });

  it('receive', function(done) {
    var self = this;
    this.connection.on('message', function(message) {
      assert.deepEqual(message, self.sampleMessage);
      done();
    });
    this.webSocketServer.on('connection', function() {
      self.webSocketServer.send(JSON.stringify(self.sampleMessage));
    });
  });

});
