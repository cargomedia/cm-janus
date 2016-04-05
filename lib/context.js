var _ = require('underscore');

function Context(fields) {
  this.fields = _.clone(fields || {});
}

/**
 * @param {Object} fields
 * @returns {Context}
 */
Context.prototype.extend = function(fields) {
  this.fields = _.extend(this.fields, fields);
  return this;
};

/**
 * @param {Context} context
 * @returns {Context}
 */
Context.prototype.merge = function(context) {
  this.extend(context.toHash());
  return this;
};

/**
 * @returns {Object}
 */
Context.prototype.toHash = function() {
  return _.clone(this.fields);
};

/**
 * @returns {Context}
 */
Context.prototype.clone = function() {
  return new Context(this.fields);
};

module.exports = Context;
