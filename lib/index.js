var JanusProxy = require('./janus-proxy');
var proxy = new JanusProxy('8188', 'ws://198.23.87.26:8188/janus');
proxy.start();

var CMHttpServer = require('./cm-http-server');
httpServe = new CMHttpServer();

