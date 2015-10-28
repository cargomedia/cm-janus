var minilog = require('minilog');
var fs = require('fs');
var config = require('config');

if (!config.has('app.logPath')) {
  throw new Error('Trying to create logger without config');
}
var logFilePath = __dirname + '/../' + config.get('app.logPath');

var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});

minilog.enable(); //instead of pipe to console
minilog.pipe(stream);

module.exports = minilog('app');
