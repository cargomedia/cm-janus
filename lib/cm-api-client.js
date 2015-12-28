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
 * @private
 * @returns {Promise}
 */
CMApiClient.prototype._requestPromise = requestPromise;

/**
 * @param {String} action
 * @param {Array} data
 * @returns {Promise}
 * @private
 */
CMApiClient.prototype._request = function(action, data) {
  data = [this.apiKey].concat(data);

  var options = {
    method: 'POST',
    uri: this.baseUrl,
    body: {
      method: 'CM_Janus_RpcEndpoints.' + action,
      params: data
    },
    json: true
  };

  serviceLocator.get('logger').info('cm-api', 'request', options.uri, options.body);
  return this._requestPromise(options)
    .catch(function(error) {
      throw new Error('cm-api error: ' + error['message']);
    })
    .then(function(response) {
      var error = response['error'];
      if (error) {
        serviceLocator.get('logger').error('cm-api', 'response', response);
        throw new Error('cm-api error: ' + error['type'] + '. ' + error['msg']);
      }
      serviceLocator.get('logger').info('cm-api', 'response', response.body);
      return response['success']['result'];
    });
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 * @param {Number} start
 * @param {String} sessionData
 * @param {String} channelData
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(streamChannelKey, streamKey, start, sessionData, channelData) {
  return this._request('publish', [
    streamChannelKey,
    streamKey,
    +start,
    sessionData,
    channelData
  ]);
};

/**
 * @param {String} streamChannelKey
 * @param {String} streamKey
 * @param {Number} start
 * @param {String} sessionData
 * @param {String} channelData
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(streamChannelKey, streamKey, start, sessionData, channelData) {
  return this._request('subscribe', [
    streamChannelKey,
    streamKey,
    +start,
    sessionData,
    channelData
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
