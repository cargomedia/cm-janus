var WebSocket = require('ws');
var Connection = require('./connection');
var Transactions = require('./transactions');
var PeriodicTask = require('./periodic-task');
var Plugin = require('./plugin/abstract');

function SuperUserSession(janusAddress, token) {
  this._janusAddress = janusAddress;
  this._transactions = new Transactions();
  this._plugins = {};
  this._sessionId = null;
  this._token = token;

  this._keepAliveTimer = new PeriodicTask(function() {
    this._sendKeepAlive();
  }.bind(this), 30000);

  this._reconnectTimer = new PeriodicTask(function() {
    switch (this._connection.getStatus()) {
      case WebSocket.OPEN:
        return false;
        break;
      case WebSocket.CLOSED:
        this._reconnect();
        break;
      case WebSocket.CONNECTING:
      case WebSocket.CLOSING:
        break;
    }
  }.bind(this), 10000);

  this.connect();
}

SuperUserSession.prototype.connect = function() {
  var self = this;
  this._connection = new Connection('super-session', new WebSocket(this._janusAddress, 'janus-protocol'));
  this._connection.on('message', this._onMessage.bind(this));
  this._connection.on('close', this._reconnect.bind(this));
  this._reconnectTimer.run();
  return this._createSession()
    .then(function() {
      return self._attachPlugin(Plugin.STREAMING);
    })
    .then(function() {
      self._authPlugin(Plugin.STREAMING);
    })
    .then(function() {
      self._attachPlugin(Plugin.AUDIOBRIDGE);
    })
    .then(function() {
      self._authPlugin(Plugin.AUDIOBRIDGE);
    });
};

SuperUserSession.prototype._reconnect = function() {
  this._cleanup();
  this.connect();
};

SuperUserSession.prototype._cleanup = function() {
  this._connection.removeAllListeners();
  this._connection = null;
  this._sessionId = null;
  this._plugins = {};
  this._keepAliveTimer.stop();
};

SuperUserSession.prototype._onMessage = function(message) {
  this._keepAliveTimer.run();
  if (message['transaction']) {
    if (this._transactions.find(message['transaction'])) {
      this._transactions.execute(message['transaction'], message);
      return;
    }
  }

  var janusMessage = message['janus'];
  switch (janusMessage) {
    case 'thumbnail-ready':
      this._onThumbnail(message);
      break;
    case 'archive-ready':
      this._onArchive(message);
      break;
  }
};

SuperUserSession.prototype._onThumbnail = function(message) {

};

SuperUserSession.prototype._onArchive = function(message) {

};

SuperUserSession.prototype._createSession = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transactionId = self._connection.generateTransactionId();
    self._transactions.add(transactionId, function(message) {
      if ('success' == message['janus']) {
        self._sessionId = message['data']['id'];
        resolve();
      } else {
        reject();
      }
    });

    self._connection.send({
      janus: 'create',
      transaction: transactionId
    });
  });
};

SuperUserSession.prototype._attachPlugin = function(pluginName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transactionId = self._connection.generateTransactionId();
    self._transactions.add(transactionId, function(message) {
      if ('success' == message['janus']) {
        self._plugins[pluginName] = message['data']['id'];
        resolve(message);
      } else {
        reject(message);
      }
    });

    self._connection.send({
      janus: 'attach',
      plugin: pluginName,
      session_id: self._sessionId,
      transaction: transactionId
    });
  });
};

SuperUserSession.prototype._authPlugin = function(pluginName) {
  return new Promise(function(resolve, reject) {
    var transactionId = this._connection.generateTransactionId();
    this._transactions.add(transactionId, function(message) {
      if ('success' == message['janus']) {
        resolve(message);
      } else {
        reject(message);
      }
    });

    this._connection.send({
      janus: 'message',
      body: {request: 'auth', token: this._token},
      session_id: this._sessionId,
      handle_id: this._plugins[pluginName],
      transaction: transactionId
    });
  }.bind(this));
};

SuperUserSession.prototype._sendKeepAlive = function() {
  this._connection.send({
    janus: 'keepalive',
    session_id: this._sessionId,
    transaction: this._connection.generateTransactionId()
  });
};

module.exports = SuperUserSession;
