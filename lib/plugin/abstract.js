var Promise = require('bluebird');

/**
 * @param {String} id
 * @param {String} type
 * @param {Session} session
 * @constructor
 */
function PluginAbstract(id, type, session) {

  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.type = type;

  /** @type {Session} */
  this.session = session;
}

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.processRequest = function(message) {
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.processIncoming = function(message) {
  return Promise.resolve();
};

/**
 * @param {Object} response
 * @returns {boolean}
 */
PluginAbstract.prototype._isSuccessResponse = function(response) {
  var pluginData = response['plugindata'];
  var hasPluginData = pluginData && pluginData['data'];
  return hasPluginData && !pluginData['data']['error'];
};

module.exports = PluginAbstract;
