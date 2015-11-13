var serviceLocator = require('./service-locator');
var requestPromise = require('request-promise');

/**
 * @param {String} baseUrl
 * @param {String} apiKey
 */
CMApiClient = function(baseUrl, apiKey) {
  this.baseUrl = baseUrl;
  this.apiKey = apiKey;
};

/**
 * @param {String} action
 * @param {Array} data
 * @returns {Promise}
 * @private
 */
CMApiClient.prototype._request = function(action, data) {
  data.unshift(this.apiKey);

  var options = {
    method: 'POST',
    uri: this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.' + action,
    body: data
  };
  return requestPromise(options)
    .catch(function(error) {
      serviceLocator.get('logger').error(error);
      throw error;
    });
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 * @param {Number} start
 * @param {JSON} [data]
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(streamChannelKey, streamKey, start, data) {
  return this._request('publish', [
    streamChannelKey,
    streamKey,
    +start,
    data || {}
  ]);
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 * @param {Number} start
 * @param {JSON} [data]
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(streamChannelKey, streamKey, start, data) {
  return this._request('subscribe', [
    streamChannelKey,
    streamKey,
    +start,
    data || {}
  ]);
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 */
CMApiClient.prototype.removeStream = function(streamChannelKey, streamKey) {
  return this._request('removeStream', [
    streamChannelKey,
    streamKey
  ]);
};

/**
 * @param {String} data
 * @returns {Promise}
 */
CMApiClient.prototype.isValidUser = function(data) {
  return this._request('isValidUser', [data]);
};

module.exports = CMApiClient;
