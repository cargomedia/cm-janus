var assert = require('chai').assert;
var sinon = require('sinon');
var _ = require('underscore');
require('../helpers/global-error-handler');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var tmp = require('tmp');

var JobManager = require('../../lib/job/manager');
var JobHandler = require('../../lib/job/handler');
var AbstractJob = require('../../lib/job/model/abstract');
var TestJobSuccess = require('../helpers/test-jobs').Success;
var TestJobSleep = require('../helpers/test-jobs').Sleep;
var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');

describe('JobManager', function() {

  var globalTmpDir = path.join(__dirname, '/tmp');
  var tempJobsDir = path.join(globalTmpDir, '/job-tmp/');

  function randomString() {
    return Math.random().toString(36).substring(2, 10);
  }

  function createLocalTmpDir() {
    var tmpDirPath = path.join(globalTmpDir, randomString());
    return fs.mkdirAsync(tmpDirPath).then(function() {
      return tmpDirPath;
    });
  }

  function createJobFile(dir, data) {
    var filepath = path.join(dir, randomString() + '.json');
    return fs.writeFileAsync(filepath, JSON.stringify(data), {encoding: 'utf8', flag: 'w'}).then(function() {
      return filepath;
    });
  }

  function randomTestJobData() {
    return {
      plugin: TestJobSuccess.getPlugin(),
      event: TestJobSuccess.getEvent(),
      data: {
        streamChannelId: '1',
        audio: '/path/123.rtp',
        video: '/path/124.rtp'
      }
    };
  }

  before(function() {
    mkdirp.sync(globalTmpDir);
    serviceLocator.register('logger', function() {
      return new Logger();
    });
  });

  after(function(done) {
    rimraf(tempJobsDir, function() {
      rimraf(globalTmpDir, function(err) {
        done(err);
      });
    });
  });

  beforeEach(function() {
    rimraf.sync(tempJobsDir);
  });

  it('test job call', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var jobData = randomTestJobData();
      var manager = new JobManager(tmpDirPath, tempJobsDir, [new JobHandler(TestJobSuccess)]);
      sinon.spy(manager, '_addJob');
      manager.start();

      createJobFile(tmpDirPath, jobData).then(function(jobFilepath) {
        setTimeout(function() {
          assert.isTrue(manager._addJob.calledOnce);
          var args = manager._addJob.firstCall.args;
          var job = args[0];
          assert.isTrue(job instanceof AbstractJob);
          assert.deepEqual(job._jobData, jobData['data']);

          assert.throws(function() {
            fs.accessSync(jobFilepath);
          });

          fs.rmdirAsync(tmpDirPath).then(function() {
            done();
          });
        }, 1000);//here we need to wait a bit to give time to job to run.
      });
    });
  });

  it('stops job on shutdown', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var manager = new JobManager(tmpDirPath, tempJobsDir);
      manager.start();
      var job = sinon.createStubInstance(AbstractJob);
      job.run = function() {
        return Promise.resolve();
      };
      manager.processJob(job);
      sinon.stub(manager, 'stopJob');
      manager.stop().then(function() {
        assert.isTrue(manager.stopJob.withArgs(job).calledOnce);
        done();
      });
    });
  });

  it('cancels and removes job on stopJob', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var manager = new JobManager(tmpDirPath);
      sinon.stub(manager, '_removeJob');
      var job = sinon.createStubInstance(AbstractJob);
      manager.stopJob(job);
      assert.isTrue(manager._removeJob.withArgs(job.id).calledOnce);
      assert.isTrue(job.cancel.calledOnce);
      done();
    });
  })

});
