cm-janus [![Build Status](https://travis-ci.org/cargomedia/cm-janus.png?branch=master)](https://travis-ci.org/cargomedia/cm-janus)
========

## About
Bridge between cm-application and janus-gateway. Once running it should:
- Provide WebSocket proxy for connections between [Janus javascript client](https://github.com/meetecho/janus-gateway/blob/master/html/janus.js) library and [janus-gateway](https://github.com/meetecho/janus-gateway) server.
- Provide HTTP Server for accepting [cm-application](https://github.com/cargomedia/cm) requests.
- Send cm-application api requests on certain events.

## Installation
Install as npm package:
```
npm install cm-janus
```

## Running
Run services using:
```
bin/cm-janus
```
cm-janus is based on single configuration file written in yaml format. Default config is present under [`bin/config.yaml`](bin/config.yaml).
You can provide different config file using `-c` option (e.g. `bin/cm-janus -c /path/to/my/config/yaml`). New config will completely overwrite old one. Old one won't be used for defaults.

Config format:

```yaml
logPath: 'log/app.log' # path to log file (relative to working dir)
proxy:
  listenPort: '8188' # port for incoming WebSocket connections
  janusAddress: 'ws://198.23.87.26:8188/janus' # janus-gateway address for proxying WebSocket connections
httpServer:
  port: 8888 # port for incoming http api requests
  apiKey: '123fish' # token for authenticating incoming http request
cmApi:
  baseUrl: 'http://www.cm.dev' # cm-application address
  apiKey: '123fish' # token for authentication, sent with each http request
```
