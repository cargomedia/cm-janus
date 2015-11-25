var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
var path = require('path');
var fs = require("fs");
var tmpNameSync = require('tmp').tmpNameSync;
var rimraf = require('rimraf');

var Logger = require('../../lib/logger');

var globalTmpDir = path.join(__dirname, '/tmp');

describe('Logger', function() {
  /**
   * @type {string}
   */
  var logFilePath = '';

  /**
   * @type {WriteStream}
   */
  var stream;

  /**
   * @type {Logger}
   */
  var logger;

  before(function(done) {
    fs.mkdir(globalTmpDir, function() {
      logFilePath = tmpNameSync({dir: globalTmpDir, postfix: '.log'});
      done();
    });
  });

  after(function(done) {
    rimraf(globalTmpDir, function(err) {
      done(err);
    });
  });

  beforeEach(function() {
    stream = fs.createWriteStream(logFilePath, {flags: 'w', defaultEncoding: 'utf8'});
    logger = new Logger('test');
    logger.pipe(stream);
  });

  it('debug numbers', function(done) {
    logger.debug('foo', 3);
    stream.end(function() {
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'test debug foo 3\n');
      done();
    });
  });

  it('info arrays', function(done) {
    logger.info('foo', ['bar', 'baz', 'quux'], 1);
    stream.end(function() {
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'test info foo ["bar","baz","quux"] 1\n');
      done();
    });
  });

  it('warn objects and arrays', function(done) {
    logger.warn({foo: [1, 2, 3], bar: {buz: 1}}, ['foo', 'bar', 'buz']);
    stream.end(function() {
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'test warn {"foo":[1,2,3],"bar":{"buz":1}} ["foo","bar","buz"]\n');
      done();
    });
  });

  it('error Error instance', function(done) {
    logger.error(new Error("Test error") , 'bar');
    stream.end(function() {
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'test error {"message":"Test error"} bar\n');
      done();
    });
  });

  it('error Error instance interpolated', function(done) {
    logger.error('bar ' + new Error("Test error") );
    stream.end(function() {
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'test error bar Error: Test error\n');
      done();
    });
  });
});
