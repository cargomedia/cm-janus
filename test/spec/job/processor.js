var assert = require('chai').assert;
var sinon = require('sinon');
require('../../helpers/globals');
var path = require('path');
var util = require('util');
var Promise = require('bluebird');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var JobProcessor = require('../../../lib/job/processor');
var AbstractJob = require('../../../lib/job/model/abstract');

describe('JobProcessor', function() {

  var JobClass, tempJobsDir = path.join(__dirname, '/tmp');

  before(function() {
    JobClass = function() {
      AbstractJob.prototype.constructor.apply(this, arguments);
    };
    util.inherits(JobClass, AbstractJob);
    sinon.stub(JobClass.prototype, 'getName').returns('job-name');
  });

  beforeEach(function() {
    mkdirp.sync(tempJobsDir);
  });

  afterEach(function() {
    rimraf.sync(tempJobsDir);
  });

  it('runs job when processes it', function(done) {
    var job = new JobClass('id', {}, {});
    sinon.stub(job, '_run', function() {
      return Promise.resolve('success');
    });

    var processor = new JobProcessor(tempJobsDir);
    processor.start();
    processor.process(job).then(function(result) {
      assert.equal('success', result);
      assert.isTrue(job._run.calledOnce);
      done();
    });
  });

  it('always retries to process a failed job', function(done) {
    var job = new JobClass('id', {}, {});
    var retryLimit = 3;
    var retryNumber = 0;
    sinon.stub(job, '_run', function() {
      retryNumber++;
      if (retryNumber < retryLimit) {
        return Promise.reject(new Error('failed'));
      } else {
        return Promise.resolve('success');
      }
    });

    var processor = new JobProcessor(tempJobsDir, null, 50);
    processor.start();
    processor.processUntilSuccessful(job).then(function(result) {
      assert.equal(retryNumber, retryLimit);
      assert.equal('success', result);
      done();
    });
  });

  it('processes a low load independently', function(done) {
    var job1 = new JobClass('id', {}, {});
    sinon.stub(job1, '_run', function() {
      return Promise.delay(300, 'value1');
    });
    var job2 = new JobClass('id', {}, {});
    sinon.stub(job2, '_run', function() {
      return Promise.delay(300, 'value2');
    });

    var processor = new JobProcessor(tempJobsDir, 2);
    processor.start();
    Promise.all([processor.process(job1), processor.process(job2)])
      .timeout(300 + 50)
      .then(function(results) {
        assert.equal(results[0], 'value1');
        assert.equal(results[1], 'value2');
        done();
      });
  });

  it('processes a high load in a queue', function(done) {
    var job1 = new JobClass('id', {}, {});
    sinon.stub(job1, '_run', function() {
      return Promise.delay(300);
    });
    var job2 = new JobClass('id', {}, {});
    sinon.stub(job2, '_run', function() {
      return Promise.delay(300);
    });

    var processor = new JobProcessor(tempJobsDir, 1);
    processor.start();
    var jobPromise1 = processor.process(job1);
    var jobPromise2 = processor.process(job2);
    Promise.all([jobPromise1, jobPromise2])
      .timeout(300 + 50)
      .catch(Promise.TimeoutError, function() {
        assert.isTrue(jobPromise1.isFulfilled());
        assert.isTrue(jobPromise2.isPending());
        done();
      });
  });

  it('stops correctly', function(done) {
    var job = new JobClass('id', {}, {});
    sinon.stub(job, '_run', function() {
      return Promise.delay(3000);
    });
    sinon.stub(job, 'cancel').returns();

    var processor = new JobProcessor(tempJobsDir);
    processor.start();
    processor.process(job);

    assert.isFalse(job.cancel.called);
    processor.stop().then(function() {
      assert.isTrue(job.cancel.calledOnce);
      done();
    });
  });

});
