var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var janusClient = require('janus-client');
var config = require('config');
var logger = require('./logger');
var getLog = logger.getLog;

var CmRestServer = function() {
  logger.configure(config.get('app.logPath').toString());
  var app = express();
  var router = express.Router();
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  //IMPORTANT! Do not remove unused `next`.
  app.use(function(err, req, res, next) {
    var errorMessage = err.message || 'Unexpected error';
    getLog().error(errorMessage);
    res.status(err.code || 500).send({error: errorMessage});
  });

  process.on('uncaughtException', function(err) {
    getLog().error('Uncaught exception ' + err.message);
    process.nextTick(process.exit(1));
  });

  this.janusClient = new JanusClient();
  var self = this;
  this.janusClient.connect().then(function() {
    self.installHandlers(router);
  });
};

CmRestServer.prototype.installHandlers = function(router) {
  var self = this;

  router.post('/audio/subscribe', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamName = params.streamName;
    var audio = self.janusClient.getAudioPlugin();
    audio.on('subscribeStream', function(stream) {
      res({stream: self._parseJanusStream(stream)});
    });
    audio.subscribe(streamName);
  });

  router.post('/video/subscribe', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamName = params.streamName;
    var video = self.janusClient.getVideoPlugin();
    video.on('subscribeStream', function(stream) {
      res({stream: self._parseJanusStream(stream)});
    });
    video.subscribe(streamName);
  });

};

CmRestServer.prototype._parseJanusStream = function(stream) {

};

module.exports = CmRestServer;
