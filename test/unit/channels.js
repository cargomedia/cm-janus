var assert = require('chai').assert;
var Channel = require('../../lib/channel');
var Channels = require('../../lib/channels');
var sinon = require('sinon');
var _ = require('underscore');

assert.equalArray = function(array1, array2) {
  assert.instanceOf(array1, Array);
  assert.instanceOf(array2, Array);
  assert.strictEqual(array1.length, array2.length, 'Arrays must have the same length');
  return _.each(array1, function(element, index) {
    assert.strictEqual(element, array2[index], 'array1[' + index + '] doesnt match array2[' + index + ']');
  });
};


describe('channels', function() {

  it('add', function() {
    var channels = new Channels();
    var channel = Channel.generate('channel-name', 'channel-data');
    assert.notEqual(channels.list[channel.name], channel);

    channels.add(channel);
    assert.equal(channels.list[channel.name], channel);

    assert.throws(function() {
      channels.add(channel);
    });
  });

  it('remove', function() {
    var channels = new Channels();
    var channel = Channel.generate('channel-name', 'channel-data');
    channels.add(channel);

    channels.remove(channel);
    assert.notEqual(channels.list[channel.name], channel);

    assert.throws(function() {
      channels.remove(channel);
    });
  });

  it('contains', function() {
    var channels = new Channels();
    var channel = Channel.generate('channel-name', 'channel-data');
    assert.equal(channels.contains(channel), false);

    channels.add(channel);
    assert.equal(channels.contains(channel), true);

    channels.remove(channel);
    assert.equal(channels.contains(channel), false);
  });

  it('findByName', function() {
    var channels = new Channels();
    var channel = Channel.generate('channel-name', 'channel-data');
    channels.add(channel);

    assert.equal(channels.findByName('channel-name'), channel);
    assert.equal(channels.findByName('invalid-channel-name'), null);
  });

  it('getByNameAndData', function() {
    var channels = new Channels();
    var channel = Channel.generate('channel-name', 'channel-data');
    channels.add(channel);

    assert.equal(channels.getByNameAndData('channel-name', 'channel-data'), channel);

    assert.throw(function() {
      channels.getByNameAndData('channel-name', 'invalid-channel-data')
    }, Error, 'Channel with the same name `channel-name` but different data `invalid-channel-data` found. Data needs to be the same.');


    assert.throw(function() {
      channels.getByNameAndData('invalid-channel-name', 'irrelevant-channel-data');
    }, Error, 'Channel with name `invalid-channel-name` and data `irrelevant-channel-data` not found.');
  });
});
