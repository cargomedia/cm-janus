var logger = require('./logger');
var requestPromise = require('request-promise');

/**
 * @param {String} baseUrl
 */
CMApiClient = function(baseUrl) {
  this.baseUrl = baseUrl;
};

/**
 * @param {String} action
 * @param {Object} data
 * @returns {Promise}
 * @private
 */
CMApiClient.prototype._request = function(action, data) {
  var options = {
    method: 'POST',
    uri: this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.' + action,
    body: data
  };
  return requestPromise(options)
    .catch(function(error) {
      logger.error(error);
      throw error;
    });
};

/**
 * @param {String} streamName
 * @param {String} clientKey
 * @param {Number} start
 * @param {JSON} [data]
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(streamName, clientKey, start, data) {
  return this._request('publish', {
    streamName: streamName,
    clientKey: clientKey,
    start: +start,
    data: data || {}
  });
};

/**
 * @param {String} streamName
 * @param {String} clientKey
 * @param {Number} start
 * @param {JSON} [data]
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(streamName, clientKey, start, data) {
  return this._request('subscribe', {
    streamName: streamName,
    clientKey: clientKey,
    start: +start,
    data: data || {}
  });
};

/**
 * @param {String} streamName
 * @param {String} clientKey
 * @returns {Promise}
 */
CMApiClient.prototype.removeStream = function(streamName, clientKey) {
  return this._request('removeStream', {
    streamName: streamName,
    clientKey: clientKey
  });
};

/**
 * @param {String} sessionId
 * @param {String} streamChannelName
 * @returns {Promise}
 */
CMApiClient.prototype.authPublish = function(sessionId, streamChannelName) {
  return this._request('authPublish', {
    sessionId: sessionId,
    streamChannelName: streamChannelName
  });
};

/**
 * @param {String} sessionId
 * @param {String} streamChannelName
 * @returns {Promise}
 */
CMApiClient.prototype.authSubscribe = function(sessionId, streamChannelName) {
  return this._request('authSubscribe', {
    sessionId: sessionId,
    streamChannelName: streamChannelName
  });
};

module.exports = CMApiClient;
