Error.prototype.toJSON = function() {
  var json = {};

  Object.getOwnPropertyNames(this).forEach(function(key) {
    json[key] = this[key];
  }, this);
  return json;
};
