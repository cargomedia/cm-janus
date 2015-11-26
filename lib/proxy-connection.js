var _ = require('underscore');
var Promise = require('bluebird');
var Transactions = require('./transactions');
var Session = require('./session');
var JanusError = require('./janus-error');
var ObjectCollection = require('./object-collection');

var serviceLocator = require('./service-locator');

/**
 * @param {BrowserConnection} browserConnection
 * @param {JanusConnection} janusConnection
 * @constructor
 */
function ProxyConnection(browserConnection, janusConnection) {
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
  this.sessions = new ObjectCollection();
  this.transactions = new Transactions();
}

/**
 * @param {Object} message
 */
ProxyConnection.prototype.processMessage = function(message) {
  return this._processMessage(message).catch(function(error) {
    if (!error instanceof JanusError.Error) {
      serviceLocator.get('logger').error('Unexpected error', error);
      error = new JanusError.Unknown(message['transaction']);
    }
    this.browserConnection.send(error.response);
    throw error;
  }.bind(this));
};

ProxyConnection.prototype._processMessage = function(message) {
  if (message['transaction']) {
    if (this.transactions.find(message['transaction'])) {
      return this.transactions.execute(message['transaction'], message);
    }
  }
  var janusMessage = message['janus'];
  if ('create' === janusMessage) {
    return this.onCreate(message);
  }
  if ('destroy' === janusMessage) {
    return this.onDestroy(message);
  }

  var sessionId = message['sessionId'];
  if (sessionId) {
    var session = this.sessions.findById(sessionId);
    if (!session) {
      return Promise.reject(new JanusError.Error('Session with id `' + sessionId + '` not found'))
    }
    return session.processMessage(message);
  }
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
ProxyConnection.prototype.onCreate = function(message) {
  this.transactions.add(message['transaction'], function(response) {
    if ('success' == response['janus']) {
      var session = new Session(this, response['data']['id'], message['token']);
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
ProxyConnection.prototype.onDestroy = function(message) {
  this.transactions.add(message['transaction'], function(response) {
    this.sessions.removeById(message['sessionId']);
    this.close();
    return Promise.resolve(response);
  }.bind(this));
  return Promise.resolve(message);
};


ProxyConnection.prototype.close = function() {
  if (this.browserConnection.isOpened()) {
    this.browserConnection.removeAllListeners('message');
    this.browserConnection.close();
  }
  if (this.janusConnection.isOpened()) {
    this.janusConnection.removeAllListeners('message');
    this.janusConnection.close();
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

/**
 * @returns {String}
 */
ProxyConnection.generateTransactionId = function() {
  return Math.random().toString(36).substring(2, 12);
};

module.exports = ProxyConnection;
