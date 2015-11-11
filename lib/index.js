var services = require('./services');

function Application(config) {
  this.config = config;
}

Application.prototype.registerServices = function() {
  services.set('logger', function() {
    var minilog = require('minilog');
    var fs = require('fs');
    var logFilePath = __dirname + '/../' + this.config['logPath'];
    var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});
    minilog.enable(); //instead of pipe to console
    minilog.pipe(stream);
    return minilog('app');
  }.bind(this));

  services.set('auth', function() {
    var Auth = require('./auth');
    return new Auth();
  });

  services.set('cm-api-client', function() {
    var CMApiClient = require('./cm-api-client');
    return new CMApiClient(this.config['cmApi']['baseUrl'], this.config['cmApi']['apiKey'])
  }.bind(this));

  services.set('streams', function() {
    var Streams = require('./streams');
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
