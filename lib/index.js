var fs = require('fs');
var path = require('path');
var serviceLocator = require('./service-locator');
var CMApiClient = require('./cm-api-client');
var JanusHttpClient = require('./janus-http-client');
var Streams = require('./streams');
var Logger = require('./logger');
var CmApplication = require('./cm-application');

var HttpServer = require('./http-server');
var JanusProxy = require('./janus-proxy');
var JobManager = require('./job/manager');

function Application(config) {
  this.config = config;
}

Application.prototype.registerServices = function() {
  serviceLocator.register('logger', function() {
    var logger = new Logger('app');
    logger
      .pipe(Logger.backends.nodeConsole.formatMinilog)
      .pipe(Logger.backends.nodeConsole);

    var logFilePath = path.resolve(path.dirname(__dirname), this.config['logPath']);
    var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});
    logger
      .pipe(stream);
    return logger;
  }.bind(this));

  serviceLocator.register('cm-api-client', function() {
    return new CMApiClient(this.config['cmApi']['baseUrl'], this.config['cmApi']['apiKey']);
  }.bind(this));

  serviceLocator.register('janus-http-client', function() {
    return new JanusHttpClient(this.config['janus']['httpAddress']);
  }.bind(this));

  serviceLocator.register('streams', function() {
    return new Streams();
  });

  serviceLocator.register('cm-application', function() {
    return new CmApplication(config['cmApplication']['path']);
  });
};

Application.prototype.start = function() {
  var proxy = new JanusProxy(this.config['webSocketServer']['port'], this.config['janus']['webSocketAddress']);
  proxy.start();

  var httpServer = new HttpServer(this.config['httpServer']['port'], this.config['httpServer']['apiKey']);
  httpServer.start();

  var jobManager = new JobManager(this.config['jobManager']['jobsPath'], this.config['jobManager']['tempFilesPath'], []);
  jobManager.start();

  process.on('unhandledRejection', function(reason) {
    serviceLocator.get('logger').error('Unexpected rejection error. ' + reason.stack || reason.message);
  });

  process.on('uncaughtException', function(err) {
    serviceLocator.get('logger').error('Unexpected runtime error. Shutdown the process ' + err.stack || err.message);
    jobManager.stop().finally(function() {
      process.nextTick(process.exit(1));
    });
  });
};

module.exports = Application;
