var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;
var serviceLocator = require('../../../../lib/service-locator');
var RtpbroadcastRecordingJob = require('../../../../lib/job/model/rtpbroadcast-recording');
var CmApplication = require('../../../../lib/cm-application');
var testJobs = require('../../../helpers/test-jobs');

var tmpName = require('tmp').tmpNameSync;

describe('RtpbroadcastRecordingJob', function() {

  var cmApplication;

  before(function() {
    cmApplication = sinon.createStubInstance(CmApplication);
    serviceLocator.register('cm-application', cmApplication);
  });

  after(function() {
    serviceLocator.unregister('cm-application');
  });

  describe('given invalid jobData ', function() {
    it('with missing jobData.audio it should reject', function() {
      var jobData = {
        video: 'video-file',
        uid: 'stream-channel-id'
      };
      assert.throws(function() {
        new RtpbroadcastRecordingJob('job-id', jobData);
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

      job = new RtpbroadcastRecordingJob('job-id', jobData, configuration);
      job.setWorkingDirectory(workingDirectory);
      sinon.stub(job, '_exec', testJobs.execStub);
      job.run().then(done);
    });

    it('should merge video and audio file into mpeg file', function() {
      var command = job._exec.firstCall.args[0];
      var commandArgs = job._exec.firstCall.args[1];
      assert.equal(command, 'record');
      assert.equal(commandArgs[0], 'video-file');
      assert.equal(commandArgs[1], 'audio-file');
      assert.match(commandArgs[2], /\.webm$/);
    });

    it('should import mpeg file into cm-application', function() {
      var commandArgs = job._exec.firstCall.args[1];
      assert(cmApplication.importMediaStreamArchive.calledOnce, 'importMediaStreamArchive was not called');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[1], commandArgs[2]);
    });
  });
});

