process.on("unhandledRejection", function(reason) {
  throw reason;
});

var path = require('path');
var log4js = require('log4js');
require('../../lib/log4js-json-layout');
var serviceLocator = require('../../lib/service-locator');
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
serviceLocator.register('logger', log4js.getLogger());
