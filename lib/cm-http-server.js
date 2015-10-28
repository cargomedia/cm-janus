var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var _ = require('underscore');

var CMHttpServer = function() {
  var app = express();
  var router = express.Router();
  var server = http.createServer(app);

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(router);
  app.disable('x-powered-by');
  app.disable('etag');

  this.installRoutes(router);

  //IMPORTANT! Do not remove unused `next`.
  app.use(function(err, req, res, next) {
    var errorMessage = err.message || 'Unexpected error';
    //getLog().error(errorMessage);
    res.status(err.code || 500).send({error: errorMessage});
  });

  process.on('uncaughtException', function(err) {
    //getLog().error('Uncaught exception ' + err.message);
    process.nextTick(process.exit(1));
  });

  var listenPort = '8888';
  server.listen(listenPort);
  console.log('HTTP server on port ' + listenPort + ' started');
};

CMHttpServer.prototype.installRoutes = function(router) {
  var self = this;

  router.use(function(req, res, next) {
    if (req.body['apiKey'] != '123fish') {
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

module.exports = CMHttpServer;
