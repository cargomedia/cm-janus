var requestPromise = require('request-promise');
var serviceLocator = require('./../service-locator');
var NestedError = require('nested-error-stacks');

/**
 * @param {String} baseUrl
 * @constructor
 */
function JanusCluster(baseUrl) {
  this.baseUrl = baseUrl;
}

JanusCluster.prototype.getEdgeAddress = function() {
  return this._request('/get-edge-address');
};

/**
 * @param {String} action
 * @param {Object} [data]
 * @returns {Promise}
 * @private
 */
JanusCluster.prototype._request = function(action, data) {
  action = action || '/';
  var options = {
    method: 'POST',
    uri: this.baseUrl + action
  };
  if (data) {
    options.body = data;
  }

  serviceLocator.get('logger').info('janus-cluster', 'request', options.uri, options.body);
  return this._requestPromise(options)
    .catch(function(error) {
      throw new NestedError('janus-cluster error', error);
    })
};

JanusCluster.prototype._requestPromise = requestPromise;

module.exports = JanusCluster;
