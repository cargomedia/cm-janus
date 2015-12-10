var _ = require('underscore');
var Promise = require('bluebird');
var Transactions = require('./transactions');
var Session = require('./session');

var serviceLocator = require('./../service-locator');

/**
 * @param {String} id
 * @param {Connection} browserConnection
 * @param {Connection} janusConnection
 * @constructor
 */
function JanusConnection(id, browserConnection, janusConnection) {

  /** @type {String} */
  this.id = id;

  /** @type {Connection} */
  this.browserConnection = browserConnection;

  /** @type {Connection} */
  this.janusConnection = janusConnection;

  /** @type {Session|Null} */
  this.session = null;

  /** @type {Transactions} */
  this.transactions = new Transactions();
}

JanusConnection.prototype.processMessage = function(message) {
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

  var sessionId = message['session_id'] || null;
  if (sessionId) {
    if (this.session === null || this.session.id !== sessionId) {
      return Promise.reject(Error('Invalid session'))
    }
    return this.session.processMessage(message);
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
      this.session = new Session(this, response['data']['id'], message['token']);
      serviceLocator.get('logger').info('Added ' + this.session + ' for ' + this);
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
    this._removeSession();
    return Promise.resolve(response);
  }.bind(this));
  return Promise.resolve(message);
};

JanusConnection.prototype.onRemove = function() {
  if (null !== this.session) {
    this._removeSession();
  }
  serviceLocator.get('logger').info('Removed ' + this);
};

JanusConnection.prototype._removeSession = function() {
  this.session.onRemove();
  this.session = null;
};

/**
 * @returns {String}
 */
JanusConnection.generateTransactionId = function() {
  return Math.random().toString(36).substring(2, 12);
};

JanusConnection.prototype.toString = function() {
  return 'Connection' + JSON.stringify({id: this.id});
};

module.exports = JanusConnection;
