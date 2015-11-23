var assert = require('chai').assert;
require('../helpers/global-error-handler');
var CommandRunner = require('../../lib/command-runner');
var CmApplication = require('../../lib/cm-application');
var sinon = require('sinon');

describe('CmApplication', function() {

  this.timeout(1000);

  it('runCommand', function() {
    var commandRunner = new CommandRunner();
    sinon.stub(commandRunner, 'execute').withArgs('bin/cm', ['packageName', 'action', 'arg1', 'arg2'], {cwd: 'applicationRootPath'}).returns('foo');
    var cmApplication = new CmApplication('applicationRootPath', commandRunner);
    assert.strictEqual('foo', cmApplication.runCommand('packageName', 'action', ['arg1', 'arg2']));
  });

  it('importVideoStreamThumbnail', function() {
    var commandRunner = new CommandRunner();
    var cmApplication = new CmApplication('applicationRootPath', commandRunner);
    var runCommand = sinon.stub(cmApplication, 'runCommand');
    runCommand.withArgs('media-streams', 'import-video-thumbnail', ['streamChannelId', 'thumb']).returns('returned');
    assert.strictEqual(cmApplication.importVideoStreamThumbnail('streamChannelId', 'thumb'), 'returned');
  });

  it('importMediaStreamArchive', function() {
    var commandRunner = new CommandRunner();
    var cmApplication = new CmApplication('applicationRootPath', commandRunner);
    var runCommand = sinon.stub(cmApplication, 'runCommand');
    runCommand.withArgs('media-streams', 'import-archive', ['streamChannelId', 'archive']).returns('returned');
    assert.strictEqual(cmApplication.importMediaStreamArchive('streamChannelId', 'archive'), 'returned');
  });
});
