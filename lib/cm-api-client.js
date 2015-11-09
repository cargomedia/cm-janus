var logger = require('./logger');
var requestPromise = require('request-promise');
var config = require('./config').asHash();

/**
 * @param {String} baseUrl
 * @param {String} serverKey
 */
CMApiClient = function(baseUrl, serverKey) {
  this.baseUrl = baseUrl;
  this.serverKey = serverKey;
};

/**
 * @param {String} action
 * @param {Array} data
 * @returns {Promise}
 * @private
 */
CMApiClient.prototype._request = function(action, data) {
  data.unshift(this.serverKey);

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
 * @param {String} sessionId
 * @param {String} streamChannelKey
 * @returns {Promise}
 */
CMApiClient.prototype.authPublish = function(sessionId, streamChannelKey) {
  return this._request('authPublish', [
    sessionId,
    streamChannelKey
  ]);
};

/**
 * @param {String} sessionId
 * @param {String} streamChannelKey
 * @returns {Promise}
 */
CMApiClient.prototype.authSubscribe = function(sessionId, streamChannelKey) {
  return this._request('authSubscribe', [
    sessionId,
    streamChannelKey
  ]);
};

module.exports = new CMApiClient(config['cmApi']['baseUrl'], config['app']['serverKey']);
