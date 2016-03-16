var assert = require('chai').assert;
var sinon = require('sinon');
var _ = require('underscore');
var Promise = require('bluebird');
require('../../helpers/globals');
var JanusCluster = require('../../../lib/janus/cluster');

describe('JanusCluster unit tests', function() {

  this.timeout(1000);

  var baseUrl = 'http://cm.dev';
  var janusCluster;

  beforeEach(function() {
    janusCluster = new JanusCluster(baseUrl);
  });

  it('is created properly', function() {
    assert.strictEqual(janusCluster.baseUrl, baseUrl, 'has proper baseUrl');
  });

  context('_request()', function() {
    var action = '/foo';
    var data = {};

    it('resolves if _requestPromise resolves', function(done) {
      sinon.stub(janusCluster, '_requestPromise', _.constant(Promise.resolve('success')));
      janusCluster._request(action, data)
        .then(function(result) {
          assert.equal(result, 'success');
          done();
        })
        .catch(done);
    });

    it('add context info to _requestPromise rejection', function(done) {
      sinon.stub(janusCluster, '_requestPromise', function() {
        return Promise.reject(new Error('error'));
      });
      janusCluster._request(action, data)
        .then(function() {
          done(new Error('Should be rejected'));
        })
        .catch(function(error) {
          assert.include(error.message, 'janus-cluster');
          done();
        });
    });

    it('sends options correctly', function(done) {
      sinon.stub(janusCluster, '_requestPromise', function(options) {
        assert.deepEqual(options, {
          method: 'POST',
          uri: janusCluster.baseUrl + action,
          body: {}
        }, 'invoked with proper params');
        done();
        return Promise.resolve();
      });
      janusCluster._request(action, data);
    });

  });

  it('getEdgeAddress()', function(done) {
    sinon.stub(janusCluster, '_request', function(action) {
      assert.equal(action, '/get-edge-address');
      done();
    });
    janusCluster.getEdgeAddress();
  });

});
