require('./global');
var path = require('path');
var log4js = require('log4js');
var serviceLocator = require('./service-locator');
var Logger = require('./logger');
var CMApiClient = require('./cm-api-client');
var JanusHttpClient = require('./janus/http-client');
var JanusCluster = require('./janus/cluster');
var Streams = require('./streams');
var CmApplication = require('./cm-application');
var Context = require('./context');

var HttpServer = require('./http-server');
var JanusProxy = require('./janus/proxy');
var JobManager = require('./job/manager');
var Promise = require('bluebird');

/**
 * @param {Config} config
 * @param {Array} roles
 * @constructor
 */
function Application(config, roles) {
  this.config = config;
  this.roles = roles;
}

Application.prototype.registerServices = function() {
  serviceLocator.register('logger', function() {
    var logFilePath = path.resolve(path.dirname(__dirname), this.config['logPath']);
    log4js.configure({
      "appenders": [
        {
          "type": "logLevelFilter",
          "level": "DEBUG",
          "appender": {
            "type": "console",
            "layout": {
              "type": "colored"
            }
          }
        },
        {
          "type": "logLevelFilter",
          "level": "INFO",
          "appender": {
            "type": "file",
            "filename": logFilePath,
            "layout": {
              "type": "json"
            }
          }
        }
      ]
    });
    return new Logger(log4js.getLogger());
  }.bind(this));

  serviceLocator.register('cm-api-client', function() {
    return new CMApiClient(this.config['cmApi']['baseUrl'], this.config['cmApi']['apiKey']);
  }.bind(this));

  serviceLocator.register('http-client', function() {
    return new JanusHttpClient(this.config['janus']['httpAddress']);
  }.bind(this));

  serviceLocator.register('streams', function() {
    return new Streams();
  });

  serviceLocator.register('janus-cluster', function() {
    return new JanusCluster(this.config['janus-cluster']['httpAddress']);
  }.bind(this));

  serviceLocator.register('cm-application', function() {
    return new CmApplication(this.config['cmApplication']['path']);
  }.bind(this));
};


Application.prototype.start = function() {
  var services = [];

  if (_.contains(this.roles, 'server')) {
    var proxy = new JanusProxy(this.config['webSocketServer']['port'], this.config['janus']['webSocketAddress']);
    var httpServer = new HttpServer(this.config['httpServer']['port'], this.config['httpServer']['apiKey']);
    services.push(proxy);
    services.push(httpServer);
  }

  if (_.contains(this.roles, 'jobs')) {
    var jobManager = new JobManager(this.config['jobManager']['jobsPath'], this.config['jobManager']['tempFilesPath']);
    jobManager.handlerRegistry.registerFromConfiguration(this.config['jobManager']['handlersConfiguration']);
    services.push(jobManager);
  }

  Promise.map(services, function(service) {
    return service.start();
  }).catch(function(error) {
    serviceLocator.get('logger').fatal('Process failed. Exiting.', new Context({exception: error}));
    process.emit('close');
  });

  process.on('unhandledRejection', function(reason) {
    serviceLocator.get('logger').fatal('Unexpected rejection error.', new Context({exception: reason}));
  });

  process.on('uncaughtException', function(error) {
    serviceLocator.get('logger').fatal('Unexpected runtime error. Shutdown the process.', new Context({exception: error}));
    process.emit('close');
  });

  process.on('SIGINT', function() {
    process.emit('close');
  });

  process.on('SIGTERM', function() {
    process.emit('close');
  });

  process.on('close', function() {
    serviceLocator.get('logger').info('Closing application');
    Promise.map(services, function(service) {
      return service.stop();
    }).finally(function() {
      process.nextTick(process.exit(1));
    });
  });
};

module.exports = Application;
