var Promise = require('bluebird');
var serviceLocator = require('../../service-locator');

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
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.processMessage = function(message) {
  if (this.isValidMessage(message)) {
    return Promise.resolve(message);
  } else {
    return Promise.reject(message);
  }
};

/**
 * @param {Object} message
 */
PluginAbstract.prototype.isValidMessage = function(message) {
  return !message['janus'] || 'destroy' != message['janus'];
};

/**
 * @param {Object} response
 * @returns {Boolean}
 */
PluginAbstract.prototype._isSuccessResponse = function(response) {
  var pluginData = response['plugindata'];
  var hasPluginData = pluginData && pluginData['data'];
  return !!hasPluginData && !pluginData['data']['error'];
};

PluginAbstract.prototype.onRemove = function() {
  serviceLocator.get('logger').info('Removed ' + this);
};

PluginAbstract.prototype.toString = function() {
  return 'Plugin' + JSON.stringify({
      id: this.id,
      type: this.type
    });
};

module.exports = PluginAbstract;
