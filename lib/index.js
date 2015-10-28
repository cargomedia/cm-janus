var logger = require('./logger');

var JanusProxy = require('./janus-proxy');
var Auth = require('./auth');


var auth = new Auth();
var proxy = new JanusProxy('8188', 'ws://198.23.87.26:8188/janus', auth);
proxy.start();

var HttpServer = require('./http-server');
var apiServer = new HttpServer(logger);
apiServer.start();
