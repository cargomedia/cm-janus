var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var NestedError = require('nested-error-stacks');

var FileListener = require('./file-listener');
var JobProcessor = require('./processor');
var serviceLocator = require('../service-locator');
var JobHandlerRegistry = require('./handler-registry');
var Context = require('../context');
Promise.config({cancellation: true});

/**
 * @param {String} jobDirectory, an Absolute one!
 * @param {String} tempFilesDir, an Absolute one!
 * @param {Array} [handlers]
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
  this._processor = new JobProcessor(tempFilesDir);

  this._fileListener = new FileListener(jobDirectory);
  this._fileListener.on('file', function(file) {
    this._processJobFile(file);
  }.bind(this));
}

/**
 * @returns {Promise}
 */
JobManager.prototype.start = function() {
  this._processor.start();
  this._fileListener.start();
  return Promise.resolve();
};

/**
 * @return {Promise}
 */
JobManager.prototype.stop = function() {
  return Promise.all([this._fileListener.stop(), this._processor.stop()]);
};


/**
 * @param {String} filePath
 * @returns {Promise}
 */
JobManager.prototype._processJobFile = function(filePath) {
  var self = this;
  var context = new Context({janus: {filepath: filePath}});
  return self._readJobFile(filePath)
    .then(function(jobDescription) {
      var jobId = path.basename(filePath, '.json');
      var handler = self.handlerRegistry.get(jobDescription['plugin'], jobDescription['event']);
      var job = handler.instantiateJob(jobId, jobDescription['data']);
      context.merge(job.getContext());
      return self._processor.processUntilSuccessful(job);
    })
    .then(function() {
      serviceLocator.get('logger').debug('Removing job file', context);
      return fs.unlinkAsync(filePath);
    })
    .catch(function(error) {
      serviceLocator.get('logger').error('Processing job file failed', context.extend({exception: error}));
    });
};

/**
 * @param {String} filePath
 * @returns {Promise}
 */
JobManager.prototype._readJobFile = function(filePath) {
  return fs.readFileAsync(filePath)
    .then(function(content) {
      return Promise.try(function() {
        return JSON.parse(content);
      });
    })
    .catch(function(error) {
      throw new NestedError('Invalid job file', error)
    });
};

module.exports = JobManager;
