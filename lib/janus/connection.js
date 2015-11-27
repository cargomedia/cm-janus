var util = require('util');
var _ = require('underscore');
var Promise = require('bluebird');
var JanusSession = require('./session');
var Transactions = require('./transactions');

var ObjectCollection = require('./../object-collection');
var serviceLocator = require('./../service-locator');

/**
 * @param {WebSocketConnection} browserConnection
 * @param {WebSocketConnection} janusConnection
 * @constructor
 */
function JanusConnection(browserConnection, janusConnection) {

  /** @type {ObjectCollection} */
  this.sessions = new ObjectCollection();

  /** @type {Transactions} */
  this.transactions = new Transactions();

  /** @type {WebSocketConnection} */
  this.browserConnection = browserConnection;

  /** @type {WebSocketConnection} */
  this.janusConnection = janusConnection;
}

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype.processRequest = function(message) {
  var janusMessage = message['janus'];
  if ('create' === janusMessage) {
    return this.onCreate(message);
  }
  if ('destroy' === janusMessage) {
    return this.onDestroy(message);
  }
  if (message['sessionId']) {
    return this.sessions.getById(message['sessionId']).processRequest(message);
  }
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype.processIncoming = function(message) {
  if (message['response']) {
    if (this.transactions.find(message['transaction'])) {
      return this.transactions.execute(message['transaction'], message);
    }
  }
  if (message['sessionId']) {
    return this.sessions.getById(message['sessionId']).processIncoming(message);
  }
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype.onCreate = function(message) {
  this.transactions.add(message['transaction'], function(response) {
    if ('success' == response['janus']) {
      var session = new JanusSession(this, response['data']['id'], message['token']);
      this.sessions.add(session);
      return Promise.resolve(response);
    }
    return Promise.reject(new Error('Unknown session create response'));
  }.bind(this));
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype.onDestroy = function(message) {
  this.transactions.add(message['transaction'], function(response) {
    this.sessions.removeById(message['sessionId']);
    this.close();
    return Promise.resolve(response);
  }.bind(this));
  return Promise.resolve(message);
};


JanusConnection.prototype.close = function() {
  if (this.janusConnection.isOpened()) {
    this.janusConnection.close();
  }
  if (this.browserConnection.isOpened()) {
    this.browserConnection.close();
  }
  var streams = serviceLocator.get('streams');
  streams.findAllByConnection(this).forEach(function(stream) {
    streams.remove(stream);
    serviceLocator.get('logger').info('removing stream', stream);
    serviceLocator.get('cm-api-client').removeStream(stream.channelName, stream.id);
  });
  this.sessions.clear();
  this.transactions.clear();
};

module.exports = JanusConnection;
