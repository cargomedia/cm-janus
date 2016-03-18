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

function isPlainObj(obj) {
  if (!obj) {
    return false;
  }
  var proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype;
}


layouts.addLayout('json', function() {
  return function(logEvent) {
    var logEntry = {
      time: logEvent.startTime,
      level: logEvent.level && logEvent.level.levelStr || null,
      message: logEvent.data
    };
    try {
      if (Array.isArray(logEntry.message)) {
        var logData = logEntry.message;

        //extra params becomes part of log entry
        for (var i = logData.length - 1; i >= 0; i--) {
          if (isPlainObj(logData[i])) {
            logEntry.extra = logEntry.extra || {};
            var extra = logData.splice(i, 1)[0];
            _.defaults(logEntry.extra, extra);
          }
        }

        //apply sprintf to message
        if (typeof logData[0] === 'string') {
          if (logData[0].indexOf('%') >= 0) {
            logEntry.message = sprintf.apply(this, logData);
          }
        }
      }
      return stringify(logEntry);
    } catch (e) {
      return JSON.stringify(new NestedError('Error converting log message to JSON', e));
    }
  };
});
