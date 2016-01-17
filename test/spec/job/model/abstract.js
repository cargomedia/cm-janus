var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;

var serviceLocator = require('../../../../lib/service-locator');
var AbstractJob = require('../../../../lib/job/model/abstract');
var Logger = require('../../../../lib/logger');
var tmpName = require('tmp').tmpNameSync;
var mkdirp = require('mkdirp');
var Promise = require('bluebird');


describe('AbstractJob', function() {

  context('on cancel', function() {

    var job;

    beforeEach(function() {
      job = new AbstractJob();
      job._run = function() {
        return new Promise(function(resolve, reject) {});
      };
      job.run();
    });

    it('should cleanup', function() {
      var cleanup = sinon.spy(job, 'cleanup');
      job.cancel();
      assert.isTrue(cleanup.calledOnce);
    });

    it('should stop cancel running promise', function() {
      var cancel = sinon.stub(job._promise, 'cancel');
      job.cancel();
      assert.isTrue(cancel.calledOnce);
      assert.isNull(job._promise);
    });
  });

  context('on cleanup', function() {
    var job;

    beforeEach(function() {
      var workingDirectory = tmpName();
      mkdirp.sync(workingDirectory);

      job = new AbstractJob();
      job.setWorkingDirectory(workingDirectory);
    });

    it('should remove files within working directory', function(done) {
      job._tmpFilename('foo').then(function(jobFile) {
        fs.writeFileSync(jobFile, 'foo');
        assert.isTrue(fs.existsSync(jobFile));
        job.cleanup();
        assert.isFalse(fs.existsSync(jobFile));
        done();
      });
    });

    it('should kill running process', function(done) {
      job._runJobScript('sleep', ['0.01']).catch(function() {
        done();
      });
      var kill = sinon.spy(job._process, 'kill');
      job.cleanup();
      assert.isTrue(kill.withArgs('SIGKILL').calledOnce);
      assert.isNull(job._process);
    });
  });

  context('when running job script', function() {
    var workingDirectory, jobPromise;

    beforeEach(function() {
      workingDirectory = tmpName();
      mkdirp.sync(workingDirectory);

      var job = new AbstractJob();
      job.setWorkingDirectory(workingDirectory);
      jobPromise = job._runJobScript('pwd', []);
    });

    it('should run within job working directory', function(done) {
      jobPromise.then(function(output) {
        assert.equal(output.trim(), workingDirectory);
        done();
      })
    });
  });
});

