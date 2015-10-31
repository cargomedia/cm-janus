var logger = require('./logger').getLogger();
var requestPromise = require('request-promise');

/**
 * @param {String} baseUrl
 * @param {Number} clientKey
 */
CMApiClient = function(baseUrl, clientKey) {
  this.baseUrl = baseUrl;
  this.clientKey = clientKey;
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
 * @param {Number} start
 * @param {JSON} data
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(streamName, start, data) {
  return this._request('publish', {
    streamName: streamName,
    clientKey: this.clientKey,
    start: +start,
    data: data
  });
};

/**
 * @param {String} streamName
 * @returns {Promise}
 */
CMApiClient.prototype.unpublish = function(streamName) {
  return this._request('unpublish', {streamName: streamName});
};

/**
 * @param {String} streamName
 * @param {Number} start
 * @param {JSON} data
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(streamName, start, data) {
  return this._request('subscribe', {
    streamName: streamName,
    clientKey: this.clientKey,
    start: +start,
    data: data
  });
};

/**
 * @param {String} streamName
 * @returns {Promise}
 */
CMApiClient.prototype.unsubscribe = function(streamName) {
  return this._request('unsubscribe', {streamName: streamName});
};

/**
 * @param {String} sessionId
 * @returns {Promise}
 */
CMApiClient.prototype.authPublish = function(sessionId) {
  return this._request('authPublish', {sessionId: sessionId});
};

/**
 * @param {String} sessionId
 * @returns {Promise}
 */
CMApiClient.prototype.authSubscribe = function(sessionId) {
  return this._request('authSubscribe', {sessionId: sessionId});
};

module.exports = CMApiClient;
