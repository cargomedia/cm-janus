var _ = require('underscore');
var assert = require('chai').assert;
require('../../helpers/globals');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var FileListener = require('../../../lib/job/file-listener');

describe('FileListener', function() {

  var tmpDirPath = path.join(__dirname, '/tmp');
  var tmp1DirPath = path.join(__dirname, '/tmp1');

  function randomString() {
    return Math.random().toString(36).substring(2, 10);
  }

  function createTmpFile(dir, data) {
    var filepath = path.join(dir, randomString() + '.json');
    fs.writeFileSync(filepath, JSON.stringify(data), {encoding: 'utf8', flag: 'w'});
    return filepath;
  }

  function moveFile(srcpath, destpath) {
    fs.rename(srcpath, destpath);
  }

  beforeEach(function() {
    mkdirp.sync(tmpDirPath);
    mkdirp.sync(tmp1DirPath);
  });

  afterEach(function() {
    rimraf.sync(tmpDirPath);
    rimraf.sync(tmp1DirPath);
  });

  it('emits events for existing files', function(done) {
    var filepathList = [];
    filepathList.push(createTmpFile(tmpDirPath, {}));
    filepathList.push(createTmpFile(tmpDirPath, {}));

    var fileListener = new FileListener(tmpDirPath);
    fileListener.on('file', function(filepath) {
      assert.include(filepathList, filepath);
      filepathList = _.without(filepathList, filepath);
      if (_.isEmpty(filepathList)) {
        fileListener.stop();
        done();
      }
    });
    fileListener.start();
  });


  it('emits event for a new file', function(done) {
    var newfilePath;
    var fileListener = new FileListener(tmpDirPath);
    fileListener.start();

    fileListener.on('file', function(filepath) {
      assert.equal(newfilePath, filepath);
      fileListener.stop();
      done();
    });

    newfilePath = createTmpFile(tmpDirPath, {});
  });

  it('emits event for a file moved into directory', function(done) {
    var tmpfilePath;
    var newfilePath = path.join(tmpDirPath, randomString() + '.json');
    var fileListener = new FileListener(tmpDirPath);
    fileListener.start();

    fileListener.on('file', function(filepath) {
      assert.equal(newfilePath, filepath);
      fileListener.stop();
      done();
    });

    tmpfilePath = createTmpFile(tmp1DirPath, {});
    moveFile(tmpfilePath, newfilePath);
  });

});
