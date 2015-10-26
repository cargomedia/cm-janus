var _ = require('underscore');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var JanusClient = require('./janus-client');

var CmRestServer = function() {
  var app = express();
  var router = express.Router();
  var server = http.createServer(app);

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(router);

  var publicDir = __dirname + '/../public';
  app.use('/index', express.static(publicDir, {
    etag: false
  }));

  this.installHandlers(router);


  //IMPORTANT! Do not remove unused `next`.
  app.use(function(err, req, res, next) {
    ////TODO log
    res.status(err.code || 500).send({error: err.message || 'Unexpected error'});
  });

  process.on('uncaughtException', function(err) {
    //TODO log
    process.nextTick(process.exit(1));
  });

  this.janusClient = new JanusClient();
  this.janusClient.connect().then(function() {
    server.listen('8888');
  });
};

CmRestServer.prototype.installHandlers = function(router) {
  var self = this;

  router.post('/audio/subscribe', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamId = +params.streamId;
  });

  router.post('/video/subscribe', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamId = +params.streamId;
    self.janusClient.subscribeToVideo(streamId).then(function(result) {
      res.send({stream: self._parseJanusStream(result)});
      return next();
    });
  });

};

CmRestServer.prototype._parseJanusStream = function(stream) {
  return stream;
};

module.exports = CmRestServer;
