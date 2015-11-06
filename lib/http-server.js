var _ = require('underscore');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var logger = require('./logger');
var streams = require('./streams');

/**
 * @param {Number} port
 * @param {String} serverKey
 * @constructor
 */
function HttpServer(port, serverKey) {
  this.port = port;
  this.serverKey = serverKey;
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
    logger.error(errorMessage);
    res.status(err.code || 500).send({error: errorMessage});
  });

  process.on('uncaughtException', function(err) {
    logger.error('Uncaught exception ' + err.stack || err.message);
    process.nextTick(process.exit(1));
  });
}

HttpServer.prototype.installRoutes = function(router) {
  var self = this;

  router.use(function(req, res, next) {
    logger.debug('request ' + req.path);
    var serverKey = req.get('Server-Key');
    if (!serverKey || serverKey !== self.serverKey) {
      res.sendStatus(403);
    } else {
      next();
    }
  });

  router.post('/stopStream', function subscribe(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamId = String(params['streamId']);
    var stream = streams.find(streamId);
    if (stream) {
      stream.proxyConnection.stopStream(stream.id)
        .then(function() {
          res.send({success: 'Stream stopped'});
          return next();
        }).catch(function(error) {
          logger.warn('Stream stop failed', error);
          res.send({error: 'Stream stop failed'});
          return next();
        });
    } else {
      res.send({error: 'Unknown stream: ' + params['streamId']});
      return next();
    }
  });

  router.get('/status', function subscribe(req, res, next) {
    var result = _.map(streams.list, function(stream) {
      return {id: stream.id, channelName: stream.channelName};
    });
    res.send(result);
    return next();
  });

};

HttpServer.prototype.start = function() {
  this.server.listen(this.port);
  logger.debug('HTTP server on port ' + this.port + ' started');
};

module.exports = HttpServer;
