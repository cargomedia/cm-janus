function TestJobHandler() {
}

TestJobHandler.prototype.getPlugin = function() {
  return 'test';
};

TestJobHandler.prototype.getEvent = function() {
  return 'test';
};

TestJobHandler.prototype.handle = function(jobData) {
  console.log('#### ', jobData);
};

module.exports = TestJobHandler;
