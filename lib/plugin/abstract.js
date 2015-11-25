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

PluginAbstract.prototype._isSuccessResponse = function(response) {
  var pluginData = response['plugindata'];
  var hasPluginData = pluginData && pluginData['data'];
  return hasPluginData && !pluginData['data']['error'];
};

module.exports = PluginAbstract;
