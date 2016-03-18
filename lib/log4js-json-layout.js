var _ = require('underscore');
var layouts = require('log4js').layouts;
var sprintf = require("sprintf-js").sprintf;
var stringify = require('json-stringify-safe');
var NestedError = require('nested-error-stacks');

Object.defineProperty(Error.prototype, 'toJSON', {
  value: function() {
    var alt = {};

    Object.getOwnPropertyNames(this).forEach(function(key) {
      alt[key] = this[key];
    }, this);

    return alt;
  },
  configurable: true,
  writable: true
});

var Log4jsJsonLayout = {
  process: function(logEvent) {
    var logEntry = {
      time: logEvent.startTime.toISOString(),
      level: logEvent.level && logEvent.level.levelStr || null,
      message: logEvent.data
    };
    try {
      if (Array.isArray(logEntry.message)) {
        var logData = logEntry.message;
        this.provideExtraParams(logData, logEntry);
        this.sprintf(logData, logEntry);
      }
      return stringify(logEntry);
    } catch (e) {
      return JSON.stringify(new NestedError('Error converting log message to JSON', e));
    }
  },
  provideExtraParams: function(logData, logEntry) {
    for (var i = logData.length - 1; i >= 0; i--) {
      if (this.isPlainObj(logData[i])) {
        logEntry.extra = logEntry.extra || {};
        var extra = logData.splice(i, 1)[0];
        _.defaults(logEntry.extra, extra);
      }
    }
  },
  isPlainObj: function(obj) {
    if (!obj) {
      return false;
    }
    var proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype;
  },
  sprintf: function(logData, logEntry) {
    if (typeof logData[0] === 'string') {
      if (logData[0].indexOf('%') >= 0) {
        logEntry.message = sprintf.apply(this, logData);
      }
    }
  }
};

layouts.addLayout('json', function() {
  return Log4jsJsonLayout.process.bind(Log4jsJsonLayout);
});


var log4js = require('log4js');
var path = require('path');

var logFilePath = path.resolve(path.dirname(__dirname), './log/test.log');

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
          //"type": "pattern",
          //"pattern": "%d %p - %m"
        }
      }
    }
  ]
});


var log = log4js.getLogger();
//log.info("%2$s %3$s a %1$s", "cracker", "Polly", "wants", 'fdsjfsdjhf', 34);
log.info('meet me at %s', 'hello', {foo: 'bar'});
//var obj = new Date;
//var obj = {};
//var obj = new Error;
//console.log(isPlainObj(obj));
//log.info({foo: 'bar'});
try {
  //throw new Error('Blaaa');
} catch (err) {
  //console.log(JSON.stringify(err));
  //console.error(err);
  //log.error(err);
}
