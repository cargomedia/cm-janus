process.on("unhandledRejection", function(reason) {
  throw reason;
});

require('../../lib/global');
var path = require('path');
var log4js = require('log4js');
var serviceLocator = require('../../lib/service-locator');
var Logger = require('../../lib/logger');
var logFilePath = path.resolve(path.dirname(__dirname), '../log/test.log');
log4js.configure({
  "appenders": [
    {
      "type": "logLevelFilter",
      "level": "DEBUG",
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
serviceLocator.register('logger', new Logger(log4js.getLogger()));
