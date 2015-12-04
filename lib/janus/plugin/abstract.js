/**
 * @param {String} id
 * @param {String} type
 * @param {JanusConnection} connection
 * @constructor
 */
function PluginAbstract(id, type, connection) {
  this.id = id;
  this.type = type;
  this.connection = connection;
}

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.processMessage = function(message) {
  throw new Error('Not implemented');
};

/**
 * @param {Object} response
 * @returns {Boolean}
 */
PluginAbstract.prototype._isSuccessResponse = function(response) {
  var pluginData = response['plugindata'];
  var hasPluginData = pluginData && pluginData['data'];
  return hasPluginData && !pluginData['data']['error'];
};

PluginAbstract.prototype.onRemove = function() {
};

module.exports = PluginAbstract;
