cm-janus [![Build Status](https://travis-ci.org/cargomedia/cm-janus.svg?branch=master)](https://travis-ci.org/cargomedia/cm-janus) [![codecov.io](https://codecov.io/github/cargomedia/cm-janus/coverage.svg?branch=master)](https://codecov.io/github/cargomedia/cm-janus?branch=master)
========

## About
Bridge between cm-application and janus-gateway. Once running it should:
- Provide WebSocket proxy for connections between [Janus javascript client](https://github.com/meetecho/janus-gateway/blob/master/html/janus.js) and [janus-gateway](https://github.com/meetecho/janus-gateway) server.
- Provide HTTP Server for accepting [cm-application](https://github.com/cargomedia/cm) requests.
- Send cm-application api requests on certain events.

## Dependency Installation
Because cm-janus uses [node-inotify](https://github.com/c4milo/node-inotify) that works only in GNU/Linux, dependency installation may fall on any other OS. To solve this you need install dependencies in Linux environment. For Vagrant users there is a prepared vagrant file.
 - So start vagrant `vagrant up`
 - Tunnel `vagrant ssh`
 - Go to cm-janus dir `cd ./cm-janus`
 - Run `npm install`


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

By default cm-janus runs for all roles (server, jobs). This can be limited by passing `-r` argument (e.g. `bin/cm-janus -r server,jobs`).

Config format:

```yaml
logPath: 'log/app.log' # path to log file (relative to working dir)
httpServer:
  port: 8888 # port for incoming http api requests
  apiKey: '123fish' # token for authenticating incoming http request
webSocketServer:
  port: 8188 # port for incoming WebSocket connections
janus:
  webSocketAddress: 'ws://198.23.87.26:8188/janus' # janus-gateway webSocket address
  httpAddress: 'http://198.23.87.26:8188/janus' # janus-gateway http address
cmApi:
  baseUrl: 'http://www.cm.dev/rpc/null' # cm-application address
  apiKey: '123fish' # token for authentication, sent with each http request
cmApplication:
  path: '/home/cm' # path to local cm application
jobManager:
  jobsPath: '/tmp/jobs' # place where job definitions are stored
  tempFilesPath: '/tmp/jobs/temp-files/' # jobs handlers' temp files
  handlersConfiguration: # configuration of jobs handlers. Names in `<%= %>` delimiters are placeholders for commands arguments
    'janus.plugin.cm.audioroom:archive-finished': # audio recording job handler
      convertCommand: 'lame <%= wavFile %> <%= mp3File %>' # a command to use for converting wav into mp3
    'janus.plugin.cm.rtpbroadcast:archive-finished': # video recording job handler
      mergeCommand: 'mjr2webm <%= videoMjrFile %> <%= audioMjrFile %> <%= webmFile %>' # a command to use for merging video/audio mjr into single webm
    'janus.plugin.cm.rtpbroadcast:thumbnailing-finished': # video thumbnail job handler
      createThumbnailCommand: 'mjr2png <%= videoMjrFile %> 1920 560 <%= pngFile %>' # a command to use for converting mjr into png
```

## Testing
cm-janus uses [node-inotify](https://github.com/c4milo/node-inotify) that works only in GNU/Linux. To run tests on any other platform you need to setup a virtual Linux environment. For Vagrant users there is a prepared vagrant file.
 - So start vagrant `vagrant up`
 - Tunnel `vagrant ssh`
 - Go to cm-janus dir `cd ./cm-janus`
 - Run tests `npm run-script test`
If you are already in Linux then run only last two steps.

## Publishing
 - update package.json with a new version
 - release a new git tag with the updated package.json

After that the npm release should be done automatically. If it didn't happen then release it manually:
```
npm publish https://github.com/cargomedia/cm-janus/archive/<GitTagWithUpdatedPackageJson>.tar.gz
```
