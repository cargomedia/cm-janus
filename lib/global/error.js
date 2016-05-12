Error.prototype.toJSON = function() {
  return {
    type: this.constructor.name,
    message: this.message,
    stack: this.stack
  };
};
