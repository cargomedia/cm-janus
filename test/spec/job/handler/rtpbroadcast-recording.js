var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;

var serviceLocator = require('../../../../lib/service-locator');
var RtpbroadcastRecordingHandler = require('../../../../lib/job/handler/rtpbroadcast-recording');
var CmApplication = require('../../../../lib/cm-application');
var Logger = require('../../../../lib/logger');


describe('imports archive', function() {

  var handler, cmApplication;

  before(function() {
    handler = new RtpbroadcastRecordingHandler();
    cmApplication = sinon.createStubInstance(CmApplication);
    serviceLocator.register('logger', sinon.stub(new Logger));
    serviceLocator.register('cm-application', cmApplication);
  });

  describe('given invalid jobData ', function() {
    it('with missing jobData.audio it should reject', function(done) {
      var jobData = {
        video: 'video-file',
        streamChannelId: 'stream-channel-id'
      };
      handler.handle(jobData).catch(function(error) {
        assert.equal(error.message, 'No `audio` parameter provided');
        done();
      });
    });
  });

  describe('given valid jobData', function() {

    before(function(done) {
      sinon.stub(handler, '_exec', function(command, callback) {
        callback(null);
      });
      handler.handle({
        audio: 'audio-file',
        video: 'video-file',
        streamChannelId: 'stream-channel-id'
      }).then(done);
    });

    it('should merge video and audio file into mpeg file', function() {
      var commandArgs = handler._exec.firstCall.args[0].split(' ');
      assert(fs.existsSync(commandArgs[0]), 'script ' + commandArgs[0] + ' does not exist');
      assert.match(commandArgs[0], /rtpbroadcast-merge\.sh$/);
      assert.equal(commandArgs[1], 'audio-file');
      assert.equal(commandArgs[2], 'video-file');
      assert.match(commandArgs[3], /\.mp4$/);
    });

    it('should import mpeg file into cm-application', function() {
      var commandArgs = handler._exec.firstCall.args[0].split(' ');
      assert(cmApplication.importMediaStreamArchive.calledOnce, 'importMediaStreamArchive was not called');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importMediaStreamArchive.firstCall.args[1], commandArgs[3]);
    });

    after(function() {
      handler._exec.restore();
    });
  });
});

