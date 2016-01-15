var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;
var serviceLocator = require('../../../../lib/service-locator');
var RtpbroadcastThumbnailJob = require('../../../../lib/job/model/rtpbroadcast-thumbnail');
var CmApplication = require('../../../../lib/cm-application');


describe('imports archive', function() {

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
        id: 'stream-channel-id'
      };
      assert.throws(function() {
        new RtpbroadcastThumbnailJob(jobData);
      }, /No `thumb` parameter provided/);
    });
  });

  describe('given valid jobData', function() {

    var job;

    before(function(done) {
      var jobData = {
        thumb: 'video-file',
        id: 'stream-channel-id'
      };
      var configuration = {
        createThumbnailCommand: 'thumbnail <%= videoMjrFile %> -param value <%= pngFile %>'
      };
      job = new RtpbroadcastThumbnailJob(jobData, configuration);
      sinon.stub(job, '_exec', function(command, callback) {
        callback(null);
      });
      job.run().then(done);
    });

    it('should extract png thumbnail from video file', function() {
      var commandArgs = job._exec.firstCall.args[0].split(' ');
      assert.equal(commandArgs[0], 'thumbnail');
      assert.equal(commandArgs[1], 'video-file');
      assert.equal(commandArgs[2], '-param');
      assert.equal(commandArgs[3], 'value');
      assert.match(commandArgs[4], /\.png$/);
    });

    it('should import png file into cm-application', function() {
      var commandArgs = job._exec.firstCall.args[0].split(' ');
      assert(cmApplication.importVideoStreamThumbnail.calledOnce, 'importVideoStreamThumbnail was not called');
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[1], commandArgs[4]);
    });

  });
});

