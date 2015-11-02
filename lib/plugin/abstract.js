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

module.exports = PluginAbstract;
