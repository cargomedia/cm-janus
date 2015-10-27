var Promise = require('bluebird');
var WebSocket = require('ws');
var Transaction = require('./transaction');

var JanusClient = function() {

  /** @type {String|null} */
  this._sessionId = null;

  this._transactions = {};
  this._plugins = {};
};

JanusClient.STREAMING = 'janus.plugin.streaming';
JanusClient.AUDIO = 'janus.plugin.audio';

JanusClient.prototype.connect = function() {
  var self = this;
  return new Promise(function(resolve) {
    self._ws = new WebSocket('ws://198.23.87.26:8188/janus', 'janus-protocol');
    self._ws.on('open', function() {
      self._ws.on('message', self._onmessage.bind(self));
      self._createSession()
        .then(function() {
          return self._attachPlugin(JanusClient.STREAMING);
        })
        //.then(function() {
        //  setTimeout(function() {
        //    self._destroySession();
        //  }, 3000);
        //})
      ;
      resolve();
    });
  });
};

JanusClient.prototype.getAudioPlugin = function() {
};

JanusClient.prototype.getVideoPlugin = function() {
};

JanusClient.prototype.subscribe = function(streamName) {
};

JanusClient.prototype._onmessage = function(text, flags) {
  var message = JSON.parse(text);
  console.log('####', text);
  if (message['janus']) {
    //console.log('ws onmessage: ', message, flags);
    var transaction = this._getTransaction(message['transaction']);
    if (transaction) {
      if (message['janus'] != 'ack') {
        transaction.done(message);
        this._deleteTransaction(transaction.getId());
      }
    } else {

    }
  }
};

JanusClient.prototype.subscribeToVideo = function(streamId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        resolve(message);
        //console.log('subscribe to video:', message);
      }
    });

    self._send({
      janus: 'message',
      session_id: self._sessionId,
      handle_id: self._plugins[JanusClient.STREAMING],
      transaction: self._saveTransaction(transaction),
      body: {
        request: 'watch',
        id: streamId
      }
    });
  });
};

JanusClient.prototype.startVideo = function(jsep) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        resolve(message);
        //console.log('start video:', message);
      }
    });

    self._send({
      janus: 'message',
      session_id: self._sessionId,
      handle_id: self._plugins[JanusClient.STREAMING],
      transaction: self._saveTransaction(transaction),
      //jsep: jsep,
      body: {
        //audio: false,
        //video: false,
        request: 'start',
        id: 1
      }
    });
  });
};

JanusClient.prototype.addIceCandidate = function(candidate) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        resolve(message);
        //console.log('ice candidate:', message);
      }
    });

    self._send({
      janus: 'trickle',
      session_id: self._sessionId,
      handle_id: self._plugins[JanusClient.STREAMING],
      transaction: self._saveTransaction(transaction),
      candidate: candidate
    });
  });
};

JanusClient.prototype._attachPlugin = function(name) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        self._plugins[name] = message.data.id;
        resolve();
      }
    });

    self._send({
      janus: 'attach',
      session_id: self._sessionId,
      plugin: name,
      transaction: self._saveTransaction(transaction)
    });
  });
};

JanusClient.prototype._detachPlugin = function(name) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      console.log('detachPlugin ', message);
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        self._plugins[name] = null;
        resolve();
      }
    });

    self._send({
      janus: 'detach',
      session_id: self._sessionId,
      handle_id: self._plugins[name],
      transaction: self._saveTransaction(transaction)
    });
  });
};

JanusClient.prototype._createSession = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        self._sessionId = message.data.id;
        resolve();
      }
    });

    self._send({
      janus: 'create',
      transaction: self._saveTransaction(transaction)
    });
  });
};

JanusClient.prototype._destroySession = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var transaction = new Transaction(function(message) {
      if (message['error']) {
        reject(new Error(message['error']));
      } else {
        self._sessionId = null;
        resolve();
      }
    });

    self._send({
      janus: 'destroy',
      session_id: self._sessionId,
      transaction: self._saveTransaction(transaction)
    });
  });
};

/**
 * @param {Object} message
 */
JanusClient.prototype._send = function(message) {
  this._ws.send(JSON.stringify(message));
};

JanusClient.prototype._saveTransaction = function(transaction) {
  this._transactions[transaction.getId()] = transaction;
  return transaction.getId();
};

JanusClient.prototype._getTransaction = function(transactionId) {
  return this._transactions[transactionId];
};

/**
 * @param {String} transactionId
 */
JanusClient.prototype._deleteTransaction = function(transactionId) {
  delete this._transactions[transactionId];
};

module.exports = JanusClient;
