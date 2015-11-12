var serviceLocator = require('./service-locator');
var CMApiClient = require('./cm-api-client');
var Auth = require('./auth');
var Streams = require('./streams');

function Application(config) {
  this.config = config;
}

Application.prototype.registerServices = function() {
  serviceLocator.register('logger', function() {
    var minilog = require('minilog');
    var fs = require('fs');
    var logFilePath = __dirname + '/../' + this.config['logPath'];
    var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});
    minilog.enable(); //instead of pipe to console
    minilog.pipe(stream);
    return minilog('app');
  }.bind(this));

  serviceLocator.register('auth', function() {
    return new Auth();
  });

  serviceLocator.register('cm-api-client', function() {
    return new CMApiClient(this.config['cmApi']['baseUrl'], this.config['cmApi']['apiKey']);
  }.bind(this));

  serviceLocator.register('streams', function() {
    return new Streams();
  });
};

Application.prototype.start = function() {
  var HttpServer = require('./http-server');
  var JanusProxy = require('./janus-proxy');

  var proxy = new JanusProxy(this.config['proxy']['listenPort'], this.config['proxy']['janusAddress']);
  proxy.start();

  var httpServer = new HttpServer(this.config['httpServer']['port'], this.config['httpServer']['apiKey']);
  httpServer.start();
};

module.exports = Application;
