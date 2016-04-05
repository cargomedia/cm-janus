var _ = require('underscore');
var Promise = require('bluebird');
var serviceLocator = require('../../service-locator');
var Context = require('../../context');

/**
 * @param {String} id
 * @param {String} type
 * @param {Session} session
 * @param {Context} [context]
 * @constructor
 */
function PluginAbstract(id, type, session, context) {
  /** @type {String} */
  this.id = id;

  /** @type {String} */
  this.type = type;

  /** @type {Session} */
  this.session = session;

  if (!context) {
    context = new Context();
  }
  /** @type {Context} */
  this.context = context.extend({plugin: this.id});
}

/**
 * @param {Object} message
 * @returns {Promise}
 */
PluginAbstract.prototype.processMessage = function(message) {
  if (!this.isAllowedMessage(message)) {
    return Promise.reject(message);
  }
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 */
PluginAbstract.prototype.isAllowedMessage = function(message) {
  var isDisallowed = message['janus'] && 'destroy' === message['janus'];
  return !isDisallowed;
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
  serviceLocator.get('logger').info('Removed plugin', this.getContext());
  return Promise.resolve();
};

PluginAbstract.prototype.toString = function() {
  return 'Plugin' + JSON.stringify({
      id: this.id,
      type: this.type
    });
};

/**
 * @returns {Object}
 */
PluginAbstract.prototype.getContext = function() {
  return this.context.toHash();
};

module.exports = PluginAbstract;
