var util = require('util');
var Transactions = require('./transactions');
var Plugin = require('./plugin/abstract');

function SuperUserSession(janusAddress, token) {
  this._janusAddress = janusAddress;
  this._transactions = new Transactions();
  this._plugins = {};
  this._sessionId = null;
  this._token = token;

  this.connect();
}

SuperUserSession.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._connection = new Connection('super-session', new WebSocket(self._janusAddress, 'janus-protocol'));
    self._connection.on('message', self._onMessage.bind(self));

    self._createSession()
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
      })
      .then(resolve)
      .catch(reject);
  });
};

SuperUserSession.prototype._onMessage = function(message) {
  if (message['transaction']) {
    if (this.transactions.find(message['transaction'])) {
      this.transactions.execute(message['transaction'], message);
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

new SuperUserSession('ws://198.23.87.26:8188/janus');

