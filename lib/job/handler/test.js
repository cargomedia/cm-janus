var util = require('util');
var Promise = require('bluebird');
var AbstractJobHandler = require('./abstract');

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

TestJobHandler.prototype.handle = function(jobData) {
  console.log('#### ', jobData);
  return Promise.resolve();
};

module.exports = TestJobHandler;
