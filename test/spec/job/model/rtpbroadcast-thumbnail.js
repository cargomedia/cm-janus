var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;
var Promise = require('bluebird');
var serviceLocator = require('../../../../lib/service-locator');
var RtpbroadcastThumbnailJob = require('../../../../lib/job/model/rtpbroadcast-thumbnail');
var CmApplication = require('../../../../lib/cm-application');
var tmpName = require('tmp').tmpNameSync;

describe('RtpbroadcastThumbnailJob', function() {

  var cmApplication;

  before(function() {
    cmApplication = sinon.createStubInstance(CmApplication);
    serviceLocator.register('cm-application', cmApplication);
  });

  after(function() {
    serviceLocator.unregister('cm-application');
  });

  describe('given invalid jobData ', function() {
    it('with missing jobData.thumb it should reject', function() {
      var jobData = {
        uid: 'stream-channel-id'
      };
      assert.throws(function() {
        new RtpbroadcastThumbnailJob('job-id', jobData);
      }, /No `thumb` parameter provided/);
    });
  });

  describe('given valid jobData', function() {

    var job;

    before(function(done) {
      var jobData = {
        thumb: 'video-file',
        uid: 'stream-channel-id',
        createdAt: 1453395041
      };
      var configuration = {
        createThumbnailCommand: 'thumbnail <%= videoMjrFile %> -param value <%= pngFile %>'
      };
      var workingDirectory = tmpName();
      job = new RtpbroadcastThumbnailJob('job-id', jobData, configuration);
      job.setWorkingDirectory(workingDirectory);
      sinon.stub(job, '_spawn', function() {
        return {
          progress: function() {
            return Promise.resolve({stdout: ''});
          }
        };
      });
      job.run().then(done);
    });

    it('should extract png thumbnail from video file', function() {
      var command = job._spawn.firstCall.args[0];
      var commandArgs = job._spawn.firstCall.args[1];
      assert.equal(command, 'thumbnail');
      assert.equal(commandArgs[0], 'video-file');
      assert.equal(commandArgs[1], '-param');
      assert.equal(commandArgs[2], 'value');
      assert.match(commandArgs[3], /\.png$/);
    });

    it('should import png file into cm-application', function() {
      var commandArgs = job._spawn.firstCall.args[1];
      assert(cmApplication.importVideoStreamThumbnail.calledOnce, 'importVideoStreamThumbnail was not called');
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[1], commandArgs[3]);
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[2], 1453395041);
    });

  });
});

