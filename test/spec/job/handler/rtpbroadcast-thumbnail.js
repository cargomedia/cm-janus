var sinon = require('sinon');
var fs = require('fs');
var assert = require('chai').assert;

var serviceLocator = require('../../../../lib/service-locator');
var RtpbroadcastThumbnailHandler = require('../../../../lib/job/handler/rtpbroadcast-thumbnail');
var CmApplication = require('../../../../lib/cm-application');
var Logger = require('../../../../lib/logger');


describe('imports archive', function() {

  var handler, cmApplication;

  before(function() {
    handler = new RtpbroadcastThumbnailHandler();
    cmApplication = sinon.createStubInstance(CmApplication);
    serviceLocator.register('logger', sinon.stub(new Logger));
    serviceLocator.register('cm-application', cmApplication);
  });

  after(function() {
    serviceLocator.reset();
  });

  describe('given invalid jobData ', function() {
    it('with missing jobData.thumb it should reject', function(done) {
      var jobData = {
        id: 'stream-channel-id'
      };
      handler.handle(jobData).catch(function(error) {
        assert.equal(error.message, 'No `thumb` parameter provided');
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
        thumb: 'video-file',
        id: 'stream-channel-id'
      }).then(done);
    });

    it('should extract png thumbnail from video file', function() {
      var commandArgs = handler._exec.firstCall.args[0].split(' ');
      assert(fs.existsSync(commandArgs[0]), 'script ' + commandArgs[0] + ' does not exist');
      assert.match(commandArgs[0], /rtpbroadcast-thumb\.sh$/);
      assert.equal(commandArgs[1], 'video-file');
      assert.match(commandArgs[2], /\.png$/);
    });

    it('should import png file into cm-application', function() {
      var commandArgs = handler._exec.firstCall.args[0].split(' ');
      assert(cmApplication.importVideoStreamThumbnail.calledOnce, 'importVideoStreamThumbnail was not called');
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[0], 'stream-channel-id');
      assert.equal(cmApplication.importVideoStreamThumbnail.firstCall.args[1], commandArgs[2]);
    });

    after(function() {
      handler._exec.restore();
    });
  });
});

