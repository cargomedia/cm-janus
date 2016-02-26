var _ = require('underscore');
var assert = require('chai').assert;
var sinon = require('sinon');
require('../../helpers/globals');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var JobManager = require('../../../lib/job/manager');
var JobHandler = require('../../../lib/job/handler');
var AbstractJob = require('../../../lib/job/model/abstract');
var TestJobSuccess = require('../../helpers/test-jobs').Success;

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
  });

  after(function() {
    rimraf.sync(tempJobsDir);
    rimraf.sync(globalTmpDir);
  });

  beforeEach(function() {
    rimraf.sync(tempJobsDir);
  });

  it('calls processJobFile for a new appeared file', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var jobFilePath;
      var jobData = randomTestJobData();
      var manager = new JobManager(tmpDirPath, tempJobsDir, []);

      sinon.stub(manager, '_processJobFile', function(filePath) {
        assert.equal(jobFilePath, filePath);
        _.defer(done);
        return Promise.resolve();
      });

      createJobFile(tmpDirPath, jobData).then(function(filePath) {
        jobFilePath = filePath;
        manager.start();
      });
    });
  });

  it('processes job file correctly', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var jobData = randomTestJobData();
      var manager = new JobManager(tmpDirPath, tempJobsDir, [new JobHandler(TestJobSuccess)]);
      sinon.stub(manager._processor, 'processUntilSuccessful', function(job) {
        assert.isTrue(job instanceof AbstractJob);
        assert.deepEqual(jobData['data'], job._jobData);
        return Promise.resolve();
      });

      createJobFile(tmpDirPath, jobData).then(function(jobFilePath) {
        manager._processJobFile(jobFilePath)
          .then(function() {
            assert.throws(function() {
              fs.accessSync(jobFilePath);
            });
          })
          .then(done)
          .catch(done);
      });
    });
  });

  it('stops correctly', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var manager = new JobManager(tmpDirPath, tempJobsDir, []);
      sinon.stub(manager._fileListener, 'stop').returns(Promise.resolve());
      sinon.stub(manager._processor, 'stop').returns(Promise.resolve());

      assert.isFalse(manager._fileListener.stop.called);
      assert.isFalse(manager._processor.stop.called);
      manager.stop().then(function() {
        assert.isTrue(manager._fileListener.stop.calledOnce);
        assert.isTrue(manager._processor.stop.calledOnce);
        done();
      });
    });
  });

});
