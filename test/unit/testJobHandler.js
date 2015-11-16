var util = require('util');
var Promise = require('bluebird');
var AbstractJobHandler = require('./../../lib/job/handler/abstract');

function TestJobHandler() {
  AbstractJobHandler.apply(this, arguments);
}

util.inherits(TestJobHandler, AbstractJobHandler);

TestJobHandler.prototype.getPlugin = function() {
  return 'test';
};

TestJobHandler.prototype.getEvent = function() {
  return 'test';
};

TestJobHandler.prototype.handle = function() {
  return Promise.resolve();
};

module.exports = TestJobHandler;
