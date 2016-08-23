var assert = require('chai').assert;
var sinon = require('sinon');
var _ = require('underscore');
require('../helpers/globals');
var Channel = require('../../lib/channel');
var Stream = require('../../lib/stream');
var Streams = require('../../lib/streams');
var CmApiClient = require('../../lib/cm-api-client');
var serviceLocator = require('../../lib/service-locator');

assert.equalArray = function(array1, array2) {
  assert.instanceOf(array1, Array);
  assert.instanceOf(array2, Array);
  assert.strictEqual(array1.length, array2.length, 'Arrays must have the same length');
  return _.each(array1, function(element, index) {
    assert.strictEqual(element, array2[index], 'array1[' + index + '] doesnt match array2[' + index + ']');
  });
};


describe('streams', function() {
  var cmApiClient;

  beforeEach(function() {
    cmApiClient = new CmApiClient();
    serviceLocator.register('cm-api-client', cmApiClient);
  });

  after(function() {
    serviceLocator.unregister('cm-api-client');
  });

  it('addPublish', function(done) {
    var streams = new Streams();
    sinon.stub(streams, '_add');
    sinon.stub(cmApiClient, 'publish', function() {
      return Promise.resolve();
    });

    var stream = sinon.createStubInstance(Stream);
    streams.addPublish(stream).then(function() {
      assert.equal(cmApiClient.publish.calledWith(stream), true);
      assert.equal(streams._add.calledOnce, true);
      done();
    }).catch(done);
  });

  it('addPublish fails', function(done) {
    var streams = new Streams();
    sinon.stub(streams, '_add');
    sinon.stub(cmApiClient, 'publish', function() {
      return Promise.reject(new Error('Reason'));
    });

    var stream = sinon.createStubInstance(Stream);
    streams.addPublish(stream).then(function() {
      done(new Error('Should not resolve'));
    }, function() {
      assert.equal(cmApiClient.publish.calledWith(stream), true);
      assert.equal(streams._add.called, false);
      done();
    });
  });

  it('addSubscribe', function(done) {
    var streams = new Streams();
    sinon.stub(streams, '_add');
    sinon.stub(cmApiClient, 'subscribe', function() {
      return Promise.resolve();
    });

    var stream = sinon.createStubInstance(Stream);
    streams.addSubscribe(stream).then(function() {
      assert.equal(cmApiClient.subscribe.withArgs(stream).calledOnce, true);
      assert.equal(streams._add.calledOnce, true);
      done();
    }).catch(done);
  });

  it('addSubscribe fails', function(done) {
    var streams = new Streams();
    sinon.stub(streams, '_add');
    sinon.stub(cmApiClient, 'subscribe', function() {
      return Promise.reject(new Error('Reason'));
    });

    var stream = sinon.createStubInstance(Stream);
    streams.addSubscribe(stream).then(function() {
      done(new Error('Should not resolve'));
    }, function() {
      assert.equal(cmApiClient.subscribe.calledWith(stream), true);
      assert.equal(streams._add.called, false);
      done();
    });
  });

  it('unregister', function(done) {
    var streams = new Streams();
    sinon.stub(streams, 'remove');
    sinon.stub(cmApiClient, 'removeStream', function() {
      return Promise.resolve();
    });

    var stream = sinon.createStubInstance(Stream);
    streams.unregister(stream).then(function() {
      assert.equal(cmApiClient.removeStream.withArgs(stream).calledOnce, true);
      assert.equal(streams.remove.calledOnce, true);
      done();
    }).catch(done);
  });

  it('remove', function() {
    var streams = new Streams();
    sinon.stub(streams, '_remove');

    var stream = sinon.createStubInstance(Stream);
    streams.remove(stream);
    assert.equal(streams._remove.withArgs(stream).calledOnce, true);
  });

  it('unregisterAll', function(done) {
    var streams = new Streams();
    sinon.stub(streams, '_removeAll');
    sinon.stub(cmApiClient, 'removeAllStreams', function() {
      return Promise.resolve();
    });

    streams.unregisterAll().then(function() {
      assert.equal(cmApiClient.removeAllStreams.calledOnce, true);
      assert.equal(streams._removeAll.calledOnce, true);
      done();
    }).catch(done);
  });

  it('find', function() {
    var streams = new Streams();
    var stream = sinon.createStubInstance(Stream);
    stream.id = 'foo';
    streams.list[stream.id] = stream;
    assert.strictEqual(streams.find('foo'), stream);
    assert.strictEqual(streams.find('bar'), null);
  });

  it('findAllByChannel', function() {
    var streams = new Streams();
    var stream = sinon.createStubInstance(Stream);
    var channel1 = new Channel('id1', 'name1', '');
    var channel2 = new Channel('id2', 'name2', '');
    var channel1copy = new Channel('id1', 'name1', 'hello');
    stream.channel = channel1;
    streams._add(stream);

    assert.sameMembers(streams.findAllByChannel(channel1), [stream]);
    assert.lengthOf(streams.findAllByChannel(channel2), 0);
    assert.deepEqual(streams.findAllByChannel(channel1copy), [stream]);
  });

  it('_add', function() {
    var stream1 = sinon.createStubInstance(Stream);
    stream1.id = 'foo';
    var stream2 = sinon.createStubInstance(Stream);
    stream2.id = 'bar';

    var streams = new Streams();
    assert.strictEqual(_.size(streams.list), 0);
    streams._add(stream1);

    assert.strictEqual(_.size(streams.list), 1);
    assert.equal(streams.list['foo'], stream1);

    streams._add(stream1);
    assert.strictEqual(_.size(streams.list), 1);

    streams._add(stream2);
    assert.strictEqual(_.size(streams.list), 2);
    assert.equal(streams.list['bar'], stream2);
  });

  it('_remove', function() {
    var stream = sinon.createStubInstance(Stream);
    stream.id = 'foo';

    var streams = new Streams();
    streams.list[stream.id] = stream;
    assert.strictEqual(_.size(streams.list), 1);

    streams._remove(stream);
    assert.strictEqual(_.size(streams.list), 0);
  });

  it('_removeAll', function() {
    var stream = sinon.createStubInstance(Stream);
    stream.id = 'foo';

    var streams = new Streams();
    streams.list['foo'] = stream;
    streams.list['bar'] = stream;
    assert.strictEqual(_.size(streams.list), 2);

    streams._removeAll(stream);
    assert.strictEqual(_.size(streams.list), 0);
  });
});
