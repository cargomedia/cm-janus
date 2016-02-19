var _ = require('underscore');
var path = require('path');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var rimraf = Promise.promisify(require('rimraf'));
var fs = Promise.promisifyAll(require('fs'));

var JobFileProcessor = require('./file-processor');
var JobProcessor = require('./processor');

var serviceLocator = require('../service-locator');
var JobHandlerRegistry = require('./handler-registry');
Promise.config({cancellation: true});

/**
 * @param {String} jobDirectory, an Absolute one!
 * @param {String} tempFilesDir, an Absolute one!
 * @param {Array} handlers
 * @constructor
 */
function JobManager(jobDirectory, tempFilesDir, handlers) {
  if (!fs.statSync(jobDirectory).isDirectory()) {
    throw new Error('`jobDirectory` must be a directory');
  }
  this.handlerRegistry = new JobHandlerRegistry();
  if (handlers) {
    handlers.forEach(function(handler) {
      this.handlerRegistry.register(handler);
    }.bind(this));
  }
  this._processor  = new JobProcessor(tempFilesDir);
  this._fileProcessor = new JobFileProcessor(this._processor, jobDirectory);
}

JobManager.prototype.start = function() {
  this._processor.start();
  this._fileProcessor.processOutstanding();
  this._fileProcessor.listen();
};

/**
 * @return {Promise}
 */
JobManager.prototype.stop = function() {
  return Promise.all(this._fileProcessor.stop(), this._processor.stop());
};

module.exports = JobManager;
