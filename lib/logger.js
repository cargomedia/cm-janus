var minilog = require('minilog');
var fs = require('fs');
var config = require('config').asHash();

var logFilePath = __dirname + '/../' + config['app']['logPath'];

var stream = fs.createWriteStream(logFilePath, {flags: 'a', defaultEncoding: 'utf8'});

minilog.enable(); //instead of pipe to console
minilog.pipe(stream);

module.exports = minilog('app');
