var _ = require('underscore');
var assert = require('chai').assert;
require('../helpers/global-error-handler');
var WebSocket = require('ws');
var JanusProxy = require('../../lib/janus-proxy');
var Logger = require('../../lib/logger');
var Streams = require('../../lib/streams');
var serviceLocator = require('../../lib/service-locator');

describe('JanusProxy', function() {

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
    });
    serviceLocator.register('streams', function() {
      return new Streams();
    });
  });

  after(function() {
    serviceLocator.reset();
  });

  it('start/stop proxy', function(done) {
    var janusPort = 8889;
    var janusServer = new WebSocket.Server({port: janusPort});
    var proxyPort = 8883;
    var proxy = new JanusProxy(proxyPort, 'http://localhost:' + janusPort);

    janusServer.on('connection', function() {
      assert.equal(_.size(proxy._connections), 1);
      proxy.stop();
      assert.equal(_.size(proxy._connections), 0);
      done();
    });

    proxy.start();
    assert.equal(_.size(proxy._connections), 0);

    new WebSocket('ws://localhost:' + proxyPort);
  });
});
