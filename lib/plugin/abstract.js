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
}

PluginAbstract.STREAMING = 'janus.plugin.streaming';
PluginAbstract.AUDIOBRIDGE = 'janus.plugin.audiobridge';

module.exports = PluginAbstract;
