var path = require('path');
var Inotify = require('inotify').Inotify;
var serviceLocator = require('../service-locator');

function JobFileProcessor(processor, jobsDirectory) {
  this._processor = processor;
  this._jobsDirectory = jobsDirectory;

  this._inotify = new Inotify();
  this._watch = null;
}

JobFileProcessor.prototype.listen = function() {
  this._watch = this._inotify.addWatch({
    path: this._jobsDirectory,
    watch_for: Inotify.IN_CLOSE_WRITE,
    callback: function(event) {
      if (event.name) {
        this._processJobFile(path.join(this._jobsDirectory, event.name));
      }
    }.bind(this)
  });
};

/**
 * @returns {Promise}
 */
JobFileProcessor.prototype.stop = function() {
  this._inotify.removeWatch(this._watch);
  return Promise.resolve();
};

/**
 * @returns {Promise}
 */
JobFileProcessor.prototype.processOutstanding = function() {
  var self = this;
  return fs.readdir(this._jobsDirectory).then(function(files) {
    return Promise.all(files.map(function(basename) {
      var filePath = path.join(self._jobsDirectory, basename);
      return self._processJobFile(filePath).reflect();
    }));
  });
};

/**
 * @param {String} filePath
 * @returns {Promise}
 */
JobFileProcessor.prototype._processJobFile = function(filePath) {
  var self = this;
  return self._readJobFile(filePath)
    .then(function(jobDescription) {
      var jobId = path.basename(filePath, '.json');
      var handler = self.handlerRegistry.get(jobDescription['plugin'], jobDescription['event']);
      var job = handler.instantiateJob(jobId, jobDescription['data']);
      return self._processor.processUntilSuccessful(job);
    })
    .then(function() {
      serviceLocator.get('logger').info('Removing ' + filePath);
      return fs.unlink(filePath);
    })
    .catch(function(error) {
      var logMessage = error.stack || error.message || error;
      serviceLocator.get('logger').error(logMessage);
    });
};

/**
 * @param {String} filePath
 * @returns {Promise}
 */
JobFileProcessor.prototype._readJobFile = function(filePath) {
  return fs.readFile(filePath)
    .then(function(content) {
      return Promise.try(function() {
        return JSON.parse(content);
      });
    })
    .catch(function(error) {
      throw new Error('Invalid job file: ' + error.message)
    });
};

module.exports = JobFileProcessor;
