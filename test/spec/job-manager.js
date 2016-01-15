var assert = require('chai').assert;
var sinon = require('sinon');
require('../helpers/globals');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var rimraf = require('rimraf');
var tmp = require('tmp');
var JobManager = require('../../lib/job/manager');
var JobHandler = require('../../lib/job/handler');
var AbstractJob = require('../../lib/job/model/abstract');
var TestJobSuccess = require('../helpers/test-jobs').Success;
var TestJobSleep = require('../helpers/test-jobs').Sleep;

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

  before(function(done) {
    fs.mkdirAsync(globalTmpDir).then(function() {
      done();
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

  it('cleanups after shutdown', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var jobData = randomTestJobData();
      var delayToStop = 1000;

      var manager = new JobManager(tmpDirPath, tempJobsDir, [new JobHandler(TestJobSleep)]);
      sinon.spy(manager, '_addJob');
      manager.start();

      createJobFile(tmpDirPath, jobData).then(function() {
        setTimeout(function() {
          assert.strictEqual(fs.readdirSync(tempJobsDir).length, 1);
          var args = manager._addJob.firstCall.args;
          var job = args[0];
          var jobPromise = job._promise;
          assert.isTrue(jobPromise.isPending());
          assert.isTrue(!!job._process.pid);

          manager.stop().then(function() {
            assert.isTrue(jobPromise.isCancelled());
            assert.isNull(job._promise);
            assert.isNull(job._process);
            assert.throws(function() {
              fs.accessSync(tempJobsDir);
            });
            done();
          });
        }, delayToStop);
      });
    });
  });

});
