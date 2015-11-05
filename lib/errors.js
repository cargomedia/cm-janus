var _ = require('underscore');
var util = require('util');

function JanusError(transaction) {
}
util.inherits(JanusError, Error);

function UnauthorizedError(transaction) {
  JanusError.apply(this, arguments);

  this.message = 'Unauthorized request';
  this.response = {
    janus: 'error',
    transaction: transaction,
    error: {
      code: 403,
      reason: this.message
    }
  }
}
util.inherits(UnauthorizedError, JanusError);

function IllegalPluginError(transaction) {
  JanusError.apply(this, arguments);

  this.message = 'Illegal plugin to access';
  this.response = {
    janus: 'error',
    transaction: transaction,
    error: {
      code: 405,
      reason: this.message
    }
  }
}
util.inherits(IllegalPluginError, JanusError);

function UnknownError(transaction) {
  JanusError.apply(this, arguments);

  this.message = 'Unknown error';
  this.response = {
    janus: 'error',
    transaction: transaction,
    error: {
      code: 490,
      reason: this.message
    }
  }
}
util.inherits(UnknownError, JanusError);

module.exports = {
  JanusError: JanusError,
  UnauthorizedError: UnauthorizedError,
  IllegalPluginError: IllegalPluginError,
  UnknownError: UnknownError
};
