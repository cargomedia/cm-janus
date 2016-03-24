var _ = require('underscore');
var layouts = require('log4js').layouts;
var sprintf = require("sprintf-js").sprintf;
var stringify = require('json-stringify-safe');
var NestedError = require('nested-error-stacks');
var isPlainObject = require('is-plain-object');

var Log4jsJsonLayout = {
  process: function(logEvent) {
    var logEntry = {
      time: logEvent.startTime.toISOString(),
      level: logEvent.level && logEvent.level.levelStr || null
    };
    if (logEntry.level) {
      logEntry.level = logEntry.level.toLowerCase();
    }

    try {
      _.extend(logEntry, this.extractParams(logEvent.data));
      return stringify(logEntry);
    } catch (e) {
      return JSON.stringify(new NestedError('Error converting log message to JSON', e));
    }
  },

  extractParams: function(logData) {
    var messages = [];
    var params = {};
    logData.forEach(function(element) {
      if (isPlainObject(element)) {
        params = _.extend(params, element);
      } else {
        messages.push(element);
      }
    });
    params.message = this.parseMessages(messages);
    return params;
  },

  parseMessages: function(messages) {
    if (typeof messages[0] === 'string' && messages[0].indexOf('%') >= 0) {
      return sprintf.apply(this, messages);
    }
    return messages.join('');
  }
};

layouts.addLayout('json', function() {
  return Log4jsJsonLayout.process.bind(Log4jsJsonLayout);
});
