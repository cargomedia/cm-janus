var _ = require('underscore');
var util = require('util');

function JanusError(message, code, transaction) {
  Error.call(this, message);

  this.response = {
    janus: 'error',
    transaction: transaction,
    error: {
      code: code,
      reason: this.message
    }
  }
}
util.inherits(JanusError, Error);

function UnauthorizedError(transaction) {
  JanusError.call(this, 'Unauthorized request', 403, transaction);
}
util.inherits(UnauthorizedError, JanusError);

function IllegalPluginError(transaction) {
  JanusError.call(this, 'Illegal plugin to access', 405, transaction);
}
util.inherits(IllegalPluginError, JanusError);

function UnknownError(transaction) {
  JanusError.call(this, 'Unknown error', 490, transaction);
}
util.inherits(UnknownError, JanusError);

module.exports = {
  JanusError: JanusError,
  UnauthorizedError: UnauthorizedError,
  IllegalPluginError: IllegalPluginError,
  UnknownError: UnknownError
};
