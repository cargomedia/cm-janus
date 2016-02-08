var Promise = require('bluebird');
var Transactions = require('./transactions');
var Session = require('./session');
var JanusError = require('./error');

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
  if ('timeout' === janusMessage) {
    return this.onTimeout(message);
  }

  var sessionId = message['session_id'] || null;
  if (sessionId) {
    if (this.session !== null && this.session.id === sessionId) {
      return this.session.processMessage(message);
    } else {
      return Promise.reject(new JanusError.InvalidSession(sessionId));
    }
  }

  var pluginId = message['sender'] || message['handle_id'] || null;
  if (pluginId) {
    if (this.session && this.session.plugins[pluginId]) {
      return this.session.processMessage(message);
    } else {
      return Promise.reject(new JanusError.InvalidPlugin(pluginId));
    }
  }

  return Promise.resolve(message);
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
    return this._removeSession().then(function() {
      return response
    });
  }.bind(this));
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype.onTimeout = function(message) {
  this._removeSession();
  return Promise.resolve(message);
};

JanusConnection.prototype.onRemove = function() {
  return this._removeSession().then(function() {
    serviceLocator.get('logger').info('Removed ' + this);
  }.bind(this));
};

JanusConnection.prototype._removeSession = function() {
  if (null !== this.session) {
    return this.session.onRemove().finally(function() {
      this.session = null;
    }.bind(this));
  }
  return Promise.resolve();
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
