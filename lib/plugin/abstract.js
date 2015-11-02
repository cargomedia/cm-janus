/**
 * @param {String} id
 * @param {String} type
 * @param {BrowserConnection} browserConnection
 * @param {JanusConnection} janusConnection
 * @constructor
 */
function PluginAbstract(id, type, browserConnection, janusConnection) {
  this.id = id;
  this.type = type;
  this.browserConnection = browserConnection;
  this.janusConnection = janusConnection;
}

module.exports = PluginAbstract;
