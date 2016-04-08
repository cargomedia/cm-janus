var _ = require('underscore');
var Promise = require('bluebird');
var Transactions = require('./transactions');
var Session = require('./session');
var JanusError = require('./error');
var Context = require('../context');

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

  /** @type {Object} */
  this._sessions = {};

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
    if (this.hasSession(sessionId)) {
      return this.getSession(sessionId).processMessage(message);
    } else {
      return Promise.reject(new JanusError.InvalidSession(sessionId));
    }
  }

  //This is an invalid case, so lets log all such messages
  var pluginId = message['sender'] || message['handle_id'] || null;
  if (pluginId) {
    serviceLocator.get('logger').error('Plugin message without session', this.getContext().extend({request: message}));
    var session = _.find(this._sessions, function(session) {
      return !!session.plugins[pluginId];
    });
    if (session) {
      return session.processMessage(message);
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
      this.addSession(new Session(this, response['data']['id'], message['token']));
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
  var sessionId = message['session_id'] || null;
  if (this.hasSession(sessionId)) {
    this.transactions.add(message['transaction'], function(response) {
      return this._removeSession(sessionId).return(response);
    }.bind(this));
  }
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype.onTimeout = function(message) {
  var sessionId = message['session_id'] || null;
  if (this.hasSession(sessionId)) {
    this._removeSession(sessionId);
  }
  return Promise.resolve(message);
};

JanusConnection.prototype.onRemove = function() {
  var self = this;
  var sessions = _.values(this._sessions);
  return Promise.all(sessions.map(function(session) {
      return self._removeSession(session.id);
    }))
    .then(function() {
      serviceLocator.get('logger').info('Removed connection', self.getContext());
    });
};

JanusConnection.prototype.hasSession = function(sessionId) {
  return !!this.getSession(sessionId);
};

JanusConnection.prototype.getSession = function(sessionId) {
  return this._sessions[sessionId];
};

JanusConnection.prototype.addSession = function(session) {
  this._sessions[session.id] = session;
  serviceLocator.get('logger').info('Added session', session.getContext());
};

JanusConnection.prototype._removeSession = function(sessionId) {
  if (this.hasSession(sessionId)) {
    return this.getSession(sessionId).onRemove().then(function() {
      delete this._sessions[sessionId];
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

/**
 * @returns {Context}
 */
JanusConnection.prototype.getContext = function() {
  var context = new Context({connectionId: this.id});
  if (this.browserConnection) {
    var connectionQuery = this.browserConnection.getUrlObject().query;
    if (connectionQuery.context) {
      var connectionContext = JSON.parse(connectionQuery.context);
      context.extend(connectionContext);
    }
  }
  return context;
};

module.exports = JanusConnection;
