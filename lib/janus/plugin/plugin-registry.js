/**
 * @param {Array} pluginClassList
 * @constructor
 */
function PluginRegistry(pluginClassList) {
  this._types = {};
  pluginClassList = pluginClassList || [];
  pluginClassList.forEach(function(plugin) {
    this.registerPlugin(plugin);
  }.bind(this));
}

/**
 * @param {Function} pluginClass
 */
PluginRegistry.prototype.registerPlugin = function(pluginClass) {
  if (!(pluginClass instanceof Function)) {
    throw new Error('Plugin "' + pluginClass.constructor + '" must be instantiable');
  }
  if (!pluginClass.TYPE) {
    throw new Error('Plugin "' + pluginClass.constructor + '" must have a TYPE static field');
  }
  return this._types[pluginClass.TYPE] = pluginClass;
};

/**
 * @param {String} type
 * @returns {Boolean}
 */
PluginRegistry.prototype.isAllowedPlugin = function(type) {
  return !!this._types[type];
};

PluginRegistry.prototype.getPlugin = function(type) {
  var pluginClass = this._types[type];
  if (!pluginClass) {
    throw new Error('Invalid plugin');
  }
  return pluginClass;
};

/**
 * @param {String} id
 * @param {String} type
 * @param {JanusSession} session
 * @returns {*}
 */
PluginRegistry.prototype.instantiatePlugin = function(id, type, session) {
  var pluginClass = this.getPlugin(type);
  return new pluginClass(id, type, session);
};

module.exports = PluginRegistry;
