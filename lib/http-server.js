var _ = require('underscore');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var config = require('config');
var Logger = require('./logger');

var log = new Logger(config.get('app.logPath')).getLog();

var HttpServer = function() {
  var app = express();
  var router = express.Router();
  this.server = http.createServer(app);

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(router);
  app.disable('x-powered-by');
  app.disable('etag');

  this.installRoutes(router);

  //IMPORTANT! Do not remove unused `next`.
  app.use(function(err, req, res, next) {
    var errorMessage = err.message || 'Unexpected error';
    log.error(errorMessage);
    res.status(err.code || 500).send({error: errorMessage});
  });

  process.on('uncaughtException', function(err) {
    log.error('Uncaught exception ' + err.message);
    process.nextTick(process.exit(1));
  });
};

HttpServer.prototype.installRoutes = function(router) {
  var self = this;

  if (!config.has('httpServer.apiKey')) {
    log.error("Secret apiKey isn't set");
    process.exit(1);
  }
  var apiKey = config.get('httpServer.apiKey');

  router.use(function(req, res, next) {
    if (req.body['apiKey'] != apiKey) {
      res.sendStatus(403);
    } else {
      next();
    }
  });

  router.post('/stopStream', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamId = +params['streamId'];
    res.send('Stop stream received: ' + streamId);
  });

  router.get('/status', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    res.send('Status received');
  });

};

HttpServer.prototype.start = function() {
  var listenPort = config.get('httpServer.port').toString();
  this.server.listen(listenPort);
  log.debug('HTTP server on port ' + listenPort + ' started');
};

module.exports = HttpServer;
