var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;
var Promise = require('bluebird');
var serviceLocator = require('../../../../lib/service-locator');
var AudioroomRecordingJob = require('../../../../lib/job/model/audioroom-recording');
var CmApplication = require('../../../../lib/cm-application');
var tmpName = require('tmp').tmpNameSync;


describe('AudioroomRecordingJob', function() {

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
        uid: 'stream-channel-id'
      };
      assert.throws(function() {
        new AudioroomRecordingJob('job-id', jobData);
      }, /No `audio` parameter provided/);
    });
  });

  describe('given valid jobData', function() {

    var job;

    before(function(done) {
      var jobData = {
        audio: 'audio-file',
        uid: 'stream-channel-id'
      };
      var configuration = {
        convertCommand: 'foo <%= wavFile %> bar <%= mp3File %>'
      };
      var workingDirectory = tmpName();

      job = new AudioroomRecordingJob('job-id', jobData, configuration);
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

    it('should convert audio into mpeg file', function() {
      var command = job._spawn.firstCall.args[0];
      var commandArgs = job._spawn.firstCall.args[1];
      assert.equal(command, 'foo');
      assert.equal(commandArgs[0], 'audio-file');
      assert.equal(commandArgs[1], 'bar');
      assert.match(commandArgs[2], /\.mp3$/);
    });

    it('should import audio mpeg file into cm-application', function() {
      var commandArgs = job._spawn.firstCall.args[1];
      assert(cmApplication.importMediaStreamArchive.calledOnce, 'importMediaStreamArchive was not called');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[1], commandArgs[2]);
    });
  });
});

