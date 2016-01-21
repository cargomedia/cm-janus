var assert = require('chai').assert;
require('../helpers/globals');
var CmApplication = require('../../lib/cm-application');
var sinon = require('sinon');

describe('CmApplication', function() {

  this.timeout(1000);

  it('runCommand success', function(done) {
    var cmApplication = new CmApplication('applicationRootPath');
    var exec = sinon.stub(cmApplication, '_exec', function(command, options, callback) {
      callback(null);
    });
    cmApplication.runCommand('packageName', 'action', ['arg1', 'arg2']).then(function() {
      assert(exec.withArgs('bin/cm packageName action arg1 arg2', {cwd: 'applicationRootPath'}).calledOnce);
      done();
    })
  });

  it('runCommand with error', function(done) {
    var cmApplication = new CmApplication('applicationRootPath');
    var exec = sinon.stub(cmApplication, '_exec', function(command, options, callback) {
      callback(new Error('foo message'));
    });
    cmApplication.runCommand('packageName', 'action', ['arg1', 'arg2']).catch(function(error) {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'foo message');
      assert(exec.withArgs('bin/cm packageName action arg1 arg2', {cwd: 'applicationRootPath'}).calledOnce);
      done();
    })
  });

  it('importVideoStreamThumbnail', function() {
    var cmApplication = new CmApplication('applicationRootPath');
    var runCommand = sinon.stub(cmApplication, 'runCommand');
    runCommand.returns(Promise.resolve());
    assert.instanceOf(cmApplication.importVideoStreamThumbnail('streamChannelId', 'thumb', 1453395041), Promise);
    assert(runCommand.withArgs('media-streams', 'import-video-thumbnail', ['streamChannelId', 'thumb', 1453395041]).calledOnce);

  });

  it('importMediaStreamArchive', function() {
    var cmApplication = new CmApplication('applicationRootPath');
    var runCommand = sinon.stub(cmApplication, 'runCommand');
    runCommand.returns(Promise.resolve());
    assert.instanceOf(cmApplication.importMediaStreamArchive('streamChannelId', 'archive'), Promise);
    assert(runCommand.withArgs('media-streams', 'import-archive', ['streamChannelId', 'archive']).calledOnce);
  });
});
