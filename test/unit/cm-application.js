var assert = require('chai').assert;
require('../helpers/global-error-handler');
var CmApplication = require('../../lib/cm-application');
var sinon = require('sinon');

describe('CmApplication', function() {

  this.timeout(1000);

  it('runCommand', function() {
    var cmApplication = new CmApplication('applicationRootPath');
    var spawnSync = sinon.stub(cmApplication, '_spawnSync');

    spawnSync.onCall(0).returns({error: new Error('foo')})
    assert.throw(function() {
      cmApplication.runCommand('packageName', 'action', ['arg1', 'arg2']);
    }, Error);

    spawnSync.onCall(1).returns({output: 'bar'});
    assert.strictEqual(cmApplication.runCommand('packageName', 'action', ['arg1', 'arg2']), 'bar');

    assert(spawnSync.withArgs('bin/cm', ['packageName', 'action', 'arg1', 'arg2'], {cwd: 'applicationRootPath'}).calledTwice)
  });

  it('importVideoStreamThumbnail', function() {
    var cmApplication = new CmApplication('applicationRootPath');
    var runCommand = sinon.stub(cmApplication, 'runCommand');
    runCommand.withArgs('media-streams', 'import-video-thumbnail', ['streamChannelId', 'thumb']);
    cmApplication.importVideoStreamThumbnail('streamChannelId', 'thumb');
  });

  it('importMediaStreamArchive', function() {
    var cmApplication = new CmApplication('applicationRootPath');
    var runCommand = sinon.stub(cmApplication, 'runCommand');
    runCommand.withArgs('media-streams', 'import-archive', ['streamChannelId', 'archive']);
    cmApplication.importMediaStreamArchive('streamChannelId', 'archive');
  });
});
