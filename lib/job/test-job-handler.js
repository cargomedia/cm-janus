function TestJobHandler() {
}

TestJobHandler.prototype.getType = function() {
  return 'test';
};

TestJobHandler.prototype.handle = function(job) {
  console.log('#### ', job);
};

module.exports = TestJobHandler;
