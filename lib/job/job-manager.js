var fs = require('fs');
var path = require('path');
var Inotify = require('inotify').Inotify;

var serviceLocator = require('../service-locator');
var logger = serviceLocator.get('logger');
var Job = require('./job');
var TestJobHandler = require('./test-job-handler');

/**
 * @param {String} filepath, an Absolute one!
 * @constructor
 */
function JobManager(filepath) {
  var fileStats = fs.statSync(filepath);
  if (!fileStats.isDirectory()) {
    throw new Error('`filepath` must be a directory');
  }
  this._filepath = filepath;
  this._inotify = new Inotify();
  this._jobHandlers = null;
  this._watch = null;
  this._setupJobHandlers();
  this._installFileListeners();
}

JobManager.prototype.reset = function() {
  this._removeFileListeners();
  this._installFileListeners();
};

JobManager.prototype._setupJobHandlers = function() {
  this._jobHandlers = {};
  [TestJobHandler].forEach(function(handlerClass) {
    var handler = new handlerClass();
    this._jobHandlers[handler.getType()] = handler;
  }.bind(this));
};

JobManager.prototype._installFileListeners = function() {
  this._watch = this._inotify.addWatch({
    path: this._filepath,
    watch_for: Inotify.IN_CLOSE_WRITE,
    //watch_for: Inotify.IN_AvaLL_EVENTS,
    callback: function(event) {
      var mask = event.mask;
      var isFile = !(mask & Inotify.IN_ISDIR);
      if (isFile) {
        this._handleJobFile(path.join(this._filepath, event.name));
      }
    }.bind(this)
  });
};

JobManager.prototype._handleJobFile = function(filepath) {
  fs.readFile(filepath, function(error, data) {
    if (error) {
      logger.error('Could not read the file "' + filepath + '"', error);
      //TODO should we retry the attempt here? It would be silly to throw or stop the process because of one failed file
    }
    try {
      var job = new Job(data);
      var handler = this._jobHandlers[job.type];
      handler.handle(job);
    } catch (e) {
      logger.error('Could not handle the file "' + filepath + '"', e);
      //TODO should we retry the attempt here? It would be silly to throw or stop the process because of one failed file
    }
  }.bind(this));
};

JobManager.prototype._removeFileListeners = function() {
  this._inotify.removeWatch(this._watch);
};

module.exports = JobManager;
