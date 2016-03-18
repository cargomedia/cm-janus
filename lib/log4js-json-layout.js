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

layouts.addLayout('json', function() {
  return function(loggingEvent) {
    var to_json = {
      time: loggingEvent.startTime,
      level: loggingEvent.level && loggingEvent.level.levelStr || undefined,
      data: loggingEvent.data
    };
    try {
      if (Array.isArray(to_json.data) && typeof to_json.data[0] === 'string') {
        var firstData = to_json.data[0];
        if (typeof firstData === 'string' && firstData.indexOf('%') >= 0) {
          var count = (firstData.match(/%/g) || []).length;
          count -= (firstData.match(/%%/g) || []).length * 2;
          var params = to_json.data.splice(0, count + 1);
          var str = sprintf.apply(this, params);
          to_json.data.splice(0, 0, str);
        }
      }
      return stringify(to_json);
    } catch (e) {
      return JSON.stringify(new NestedError('Error converting log message to JSON', e));
    }
  };
});
