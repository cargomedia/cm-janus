var _ = require('underscore');
var util = require('util');

/**
 * @param {String} message
 * @param {Number} [code]
 * @param {String} [transaction]
 * @constructor
 */
function JanusError(message, code, transaction) {

  /** @type {String} */
  this.transaction = transaction;

  /** @type {Number} */
  this.code = code;

  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
util.inherits(JanusError, Error);

JanusError.prototype.getWebSocketMessage = function() {
  var message = {
    janus: 'error',
    error: {
      code: this.code || 490,
      reason: this.message
    }
  };
  if (this.transaction) {
    message.transaction = this.transaction;
  }
  return message;
};

function WarningError(message, code, transaction) {
  WarningError.super_.apply(this, arguments);
}
util.inherits(WarningError, JanusError);

function FatalError(message, code, transaction) {
  FatalError.super_.apply(this, arguments);
}
util.inherits(FatalError, JanusError);

function UnauthorizedError(transaction) {
  UnauthorizedError.super_.call(this, 'Unauthorized request', 403, transaction);
}
util.inherits(UnauthorizedError, WarningError);

function IllegalPluginError(transaction) {
  IllegalPluginError.super_.call(this, 'Illegal plugin to access', 405, transaction);
}
util.inherits(IllegalPluginError, WarningError);

function UnknownError(transaction) {
  UnknownError.super_.call(this, 'Unknown error', 490, transaction);
}
util.inherits(UnknownError, FatalError);

function InvalidPlugin(transaction, pluginId) {
  InvalidPlugin.super_.call(this, 'No such plugin `' + pluginId + '`', 458, transaction);
}
util.inherits(InvalidPlugin, JanusError);

function InvalidSession(transaction, sessionId) {
  InvalidSession.super_.call(this, 'No such session `' + sessionId + '`', 458, transaction);
}
util.inherits(InvalidSession, JanusError);

module.exports = {
  Error: JanusError,
  Warning: WarningError,
  Fatal: FatalError,
  Unauthorized: UnauthorizedError,
  IllegalPlugin: IllegalPluginError,
  Unknown: UnknownError,
  InvalidPlugin: InvalidPlugin,
  InvalidSession: InvalidSession
};
