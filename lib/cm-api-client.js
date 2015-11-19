var requestPromise = require('request-promise');

/**
 * @param {ServiceLocator} serviceLocator
 * @param {String} baseUrl
 * @param {String} apiKey
 * @constructor
 */
CMApiClient = function(serviceLocator, baseUrl, apiKey) {
  this.serviceLocator = serviceLocator;
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
  var self = this;

  var options = {
    method: 'POST',
    uri: this.baseUrl,
    body: {
      method: 'CM_Janus_RpcEndpoints.' + action,
      params: data
    },
    json: true
  };

  this.serviceLocator.get('logger').info('cm-api', 'request', options.uri, options.body);
  return requestPromise(options)
    .catch(function(error) {
      throw new Error('cm-api error: ' + error['message']);
    })
    .then(function(response) {
      self.serviceLocator.get('logger').info('cm-api', 'response', response.body);
      if (response['error']) {
        throw new Error('cm-api error: ' + response['error']['msg']);
      }
      return response['success']['result'];
    });
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 * @param {Number} start
 * @param {String} data
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(streamChannelKey, streamKey, start, data) {
  return this._request('publish', [
    streamChannelKey,
    streamKey,
    +start,
    data
  ]);
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 * @param {Number} start
 * @param {String} data
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(streamChannelKey, streamKey, start, data) {
  return this._request('subscribe', [
    streamChannelKey,
    streamKey,
    +start,
    data
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
  return this._request('isValidUser', [data])
    .then(function(isValid) {
      if (!isValid) {
        throw new Error('Not valid user');
      }
    });
};

module.exports = CMApiClient;
