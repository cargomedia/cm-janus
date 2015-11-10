var Promise = require('bluebird');
var cmApiClient = require('../cm-api-client');

/**
 * @param {String} id
 * @param {String} type
 * @param {ProxyConnection} proxyConnection
 * @constructor
 */
function PluginAbstract(id, type, proxyConnection) {
  this.id = id;
  this.type = type;
  this.proxyConnection = proxyConnection;
  this.stream = null;
}

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.processMessage = function(message) {
  var janusMessage = message['janus'];

  if ('webrtcup' === janusMessage) {
    return this.onWebrtcup(message);
  }
  if ('hangup' === janusMessage) {
    return this.onHangup(message);
  }
  if ('detach' === janusMessage) {
    return this.onHangup(message);
  }

  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.onWebrtcup = function(message) {
  cmApiClient.subscribe(this.stream.channelName, this.stream.id, Date.now());
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.onHangup = function(message) {
  this.proxyConnection.removePlugin(this.id);
  this.proxyConnection.close();
  return Promise.resolve(message);
};

module.exports = PluginAbstract;
