var util = require('util');

/**
 * @param {String} message
 * @param {Number} [code]
 * @constructor
 */
function JanusError(message, code) {

  /** @type {Number} */
  this.code = code;

  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
util.inherits(JanusError, Error);

function WarningError(message, code) {
  WarningError.super_.apply(this, arguments);
}
util.inherits(WarningError, JanusError);

function FatalError(message, code) {
  FatalError.super_.apply(this, arguments);
}
util.inherits(FatalError, JanusError);

function UnauthorizedError() {
  UnauthorizedError.super_.call(this, 'Unauthorized request', 403);
}
util.inherits(UnauthorizedError, WarningError);

function IllegalPluginError() {
  IllegalPluginError.super_.call(this, 'Illegal plugin to access', 405);
}
util.inherits(IllegalPluginError, WarningError);

function UnknownError() {
  UnknownError.super_.call(this, 'Unknown error', 490);
}
util.inherits(UnknownError, FatalError);

function InvalidPlugin(pluginId) {
  InvalidPlugin.super_.call(this, 'No such plugin `' + pluginId + '`', 458);
}
util.inherits(InvalidPlugin, JanusError);

function InvalidSession(sessionId) {
  InvalidSession.super_.call(this, 'No such session `' + sessionId + '`', 458);
}
util.inherits(InvalidSession, JanusError);

function CmApiError(message) {
  CmApiError.super_.call(this, 'cm-api error: ' + message, 490);
}
util.inherits(CmApiError, JanusError);

module.exports = {
  Error: JanusError,
  Warning: WarningError,
  Fatal: FatalError,
  Unauthorized: UnauthorizedError,
  IllegalPlugin: IllegalPluginError,
  Unknown: UnknownError,
  InvalidPlugin: InvalidPlugin,
  InvalidSession: InvalidSession,
  CmApi: CmApiError
};
