function ObjectCollection() {
  this.list = {};
}

/**
 * @param {Object} object
 * @returns {Boolean}
 */
ObjectCollection.prototype.contains = function(object) {
  return _.contains(this.list, object);
};

/**
 * @param {*} id
 * @returns {Boolean}
 */
ObjectCollection.prototype.has = function(id) {
  return _.has(this.list, id);
};

/**
 * @param {Object} object
 */
ObjectCollection.prototype.add = function(object) {
  if (null !== this.findById(object.id)) {
    throw new Error('Object with id `' + object.id + '` already exists');
  }
  this.list[object.id] = object;
};

/**
 * @param {*} id
 * @returns {Object|Null}
 */
ObjectCollection.prototype.findById = function(id) {
  return this.find(function(object) {
    return object.id === id;
  });
};

/**
 * @param {Function} iteratee
 * @returns {Object|Null}
 */
ObjectCollection.prototype.find = function(iteratee) {
  var object = _.find(this.list, iteratee);
  if (_.isUndefined(object)) {
    return null;
  }
  return object;
};

/**
 * @param {*} id
 * @returns {Object}
 */
ObjectCollection.prototype.getById = function(id) {
  var object = this.findById(id);
  if (null === object) {
    throw new Error('Object with id `' + id + '` not found');
  }
  return object;
};

/**
 * @param {*} id
 */
ObjectCollection.prototype.removeById = function(id) {
  if (!this.has(id)) {
    throw new Error('Object with id `' + id + '` not found')
  }
  delete this.list[id];
};

/**
 * @param {Object} object
 */
ObjectCollection.prototype.remove = function(object) {
  this.removeById(object.id);
};

module.exports = ObjectCollection;
