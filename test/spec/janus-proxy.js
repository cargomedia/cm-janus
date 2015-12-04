require('../helpers/global-error-handler');
var WebSocket = require('ws');
var JanusProxy = require('../../lib/janus/proxy');
var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');

describe('JanusProxy', function() {

  before(function() {
    serviceLocator.reset();
    serviceLocator.register('logger', function() {
      return new Logger();
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
      done();
    });

    proxy.start();

    new WebSocket('ws://localhost:' + proxyPort);
  });
});
