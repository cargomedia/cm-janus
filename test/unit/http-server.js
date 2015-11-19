var assert = require('chai').assert;
var HttpServer = require('../../lib/http-server');
var sinon = require('sinon');


describe('Http Server alone', function() {
  it('is created properly and starts', function() {
    var port = 8811;
    var apiKey = 'fooKey';

    var httpServer = new HttpServer(port, apiKey);

    assert.instanceOf(httpServer, HttpServer);
    assert.strictEqual(httpServer.port, port);
    assert.strictEqual(httpServer.apiKey, apiKey);

    httpServer.start();
  });

  it('fails without apiKey', function() {
    assert.throw(function() {
      new HttpServer(8811);
    }, /apiKey is not defined/);
  });

});
