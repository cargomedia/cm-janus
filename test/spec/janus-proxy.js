var _ = require('underscore');
var assert = require('chai').assert;
require('../helpers/global-error-handler');
var WebSocket = require('ws');
var JanusProxy = require('../../lib/janus-proxy');
var Logger = require('../../lib/logger');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');

describe.only('JanusProxy', function() {

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
    });
    serviceLocator.register('streams', function() {
      return new Streams();
    });
  });

  beforeEach(function() {
    this.janusPort = 8889;
    this.server = new WebSocket.Server({port: this.janusPort});
    this.proxyPort = 8883;
    this.proxy = new JanusProxy(this.proxyPort, 'http://localhost:' + this.janusPort);
  });

  after(function() {
    serviceLocator.reset();
  });

  it('start/stop proxy', function(done) {
    var self = this;
    this.server.on('connection', function() {
      assert.equal(_.size(self.proxy._connections), 1);
      self.proxy.stop();
      assert.equal(_.size(self.proxy._connections), 0);
      done();
    });

    this.proxy.start();
    assert.equal(_.size(this.proxy._connections), 0);

    new WebSocket('ws://localhost:' + this.proxyPort);
  });
});
