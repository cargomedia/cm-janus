var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;

var serviceLocator = require('../../../../lib/service-locator');
var RtpbroadcastRecordingJob = require('../../../../lib/job/model/rtpbroadcast-recording');
var CmApplication = require('../../../../lib/cm-application');
var Logger = require('../../../../lib/logger');

var tmpName = require('tmp').tmpNameSync;

describe('RtpbroadcastRecordingJob', function() {

  var cmApplication;

  before(function() {
    cmApplication = sinon.createStubInstance(CmApplication);
    serviceLocator.register('logger', sinon.stub(new Logger));
    serviceLocator.register('cm-application', cmApplication);
  });

  after(function() {
    serviceLocator.reset();
  });

  describe('given invalid jobData ', function() {
    it('with missing jobData.audio it should reject', function() {
      var jobData = {
        video: 'video-file',
        uid: 'stream-channel-id'
      };
      assert.throws(function() {
        new RtpbroadcastRecordingJob(jobData);
      }, /No `audio` parameter provided/);
    });
  });

  describe('given valid jobData', function() {

    var job;

    before(function(done) {
      var jobData = {
        audio: 'audio-file',
        video: 'video-file',
        uid: 'stream-channel-id'
      };
      var configuration = {
        mergeCommand: 'record <%= videoMjrFile %> <%= audioMjrFile %> <%= webmFile %>'
      };
      var workingDirectory = tmpName();

      job = new RtpbroadcastRecordingJob(jobData, configuration);
      job.setWorkingDirectory(workingDirectory);
      sinon.stub(job, '_exec', function(command, options, callback) {
        callback(null);
      });
      job.run().then(done);
    });

    it('should merge video and audio file into mpeg file', function() {
      var commandArgs = job._exec.firstCall.args[0].split(' ');
      assert.equal(commandArgs[0], 'record');
      assert.equal(commandArgs[1], 'video-file');
      assert.equal(commandArgs[2], 'audio-file');
      assert.match(commandArgs[3], /\.webm$/);
    });

    it('should import mpeg file into cm-application', function() {
      var commandArgs = job._exec.firstCall.args[0].split(' ');
      assert(cmApplication.importMediaStreamArchive.calledOnce, 'importMediaStreamArchive was not called');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[1], commandArgs[3]);
    });
  });
});

