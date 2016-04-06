var _ = require('underscore');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var Promise = require('bluebird');

var serviceLocator = require('./service-locator');

/**
 * @param {Number} port
 * @param {String} apiKey
 * @constructor
 */
function HttpServer(port, apiKey) {
  if (!apiKey) {
    throw new Error('apiKey is not defined');
  }

  this.port = port;
  this.apiKey = apiKey;
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
    serviceLocator.get('logger').error('HttpServer error', {error: err});
    var errorMessage = err.message || 'Unexpected error';
    res.status(err.code || 500).send({error: errorMessage});
  });
}

HttpServer.prototype.installRoutes = function(router) {
  var self = this;

  router.use(function(req, res, next) {
    serviceLocator.get('logger').debug('http-server request ' + req.path);
    var serverKey = req.get('Server-Key');
    if (!serverKey || serverKey !== self.apiKey) {
      res.sendStatus(403);
    } else {
      next();
    }
  });

  router.post('/stopStream', function(req, res, next) {
    var params = _.extend({}, req.params, req.body);
    var streamId = String(params['streamId']);
    var stream = serviceLocator.get('streams').find(streamId);
    if (stream) {
      serviceLocator.get('http-client').detach(stream.plugin)
        .then(function() {
          res.send({success: 'Stream stopped'});
          return next();
        })
        .catch(function(error) {
          serviceLocator.get('logger').warn('Stream stop failed. Removing stream by force.', {error: error});
          stream.plugin.onRemove()
            .then(function() {
              res.send({error: 'Stream stop failed. Stream was removed by force.'});
              next();
            })
            .catch(function() {
              res.send({error: 'Stream stop failed. Stream was not removed.'});
              next();
            });
        });
    } else {
      res.send({error: 'Unknown stream: ' + params['streamId']});
      return next();
    }
  });

  router.get('/status', function(req, res, next) {
    var result = serviceLocator.get('streams').getAll().map(function(stream) {
      return {id: stream.id, channelName: stream.channel.name};
    });
    res.send(result);
    return next();
  });

};

/**
 * @returns {Promise}
 */
HttpServer.prototype.start = function() {
  var self = this;
  return new Promise(function(resolve) {
      self.server.listen(self.port, function(err) {
        if (err) {
          reject(err);
        } else {
          serviceLocator.get('logger').info('http-server on port ' + self.port + ' started');
          resolve();
        }
      });
    }
  );
};

/**
 * @returns {Promise}
 */
HttpServer.prototype.stop = function() {
  return new Promise(function(resolve, reject) {
    this.server.close(function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }.bind(this))
};

module.exports = HttpServer;
