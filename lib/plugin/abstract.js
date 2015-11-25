/**
 * @param {String} id
 * @param {String} type
 * @param {Session} session
 * @constructor
 */
function PluginAbstract(id, type, session) {
  this.id = id;
  this.type = type;
  this.session = session;
}

/**
 * @param {Object} response
 * @returns {boolean}
 * @private
 */
PluginAbstract.prototype._isSuccessResponse = function(response) {
  var pluginData = response['plugindata'];
  var hasPluginData = pluginData && pluginData['data'];
  return hasPluginData && !pluginData['data']['error'];
};

/**
 * @returns {ProxyConnection}
 */
PluginAbstract.prototype.getConnection = function() {
  return this.session.connection;
}

module.exports = PluginAbstract;
