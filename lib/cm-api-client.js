var logger = require('./logger');
var request = require('request');

/**
 * @param {String} baseUrl
 * @param {Number} clientKey
 */
CMApiClient = function(baseUrl, clientKey) {
  this.baseUrl = baseUrl;
  this.clientKey = clientKey;
};

var _responseHandler = function(error, response, body) {
  if (response.statusCode == 200) {
    logger.debug('Response OK');
  } else {
    logger.error('error: ' + response.statusCode);
    logger.error(body);
  }
};

/**
 * @param {String} streamName
 * @param {Number} start
 * @param {JSON} data
 */
CMApiClient.prototype.publish = function(streamName, start, data) {
  request.post(
    this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.publish',
    {form: {streamName: streamName, clientKey: this.clientKey, start: +start, data: data}},
    _responseHandler
  );
};

/**
 * @param {String} streamName
 */
CMApiClient.prototype.unpublish = function(streamName) {
  request.post(this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.unpublish',
    {form: {streamName: streamName}},
    _responseHandler
  );
};

/**
 * @param {String} streamName
 * @param {Number} start
 * @param {JSON} data
 */
CMApiClient.prototype.subscribe = function(streamName, start, data) {
  request.post(this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.subscribe',
    {form: {streamName: streamName, clientKey: this.clientKey, start: +start, data: data}},
    function(error, response, body) {
      if (response.statusCode == 200) {
        logger.log('Response OK');
      } else {
        logger.error('error: ' + response.statusCode);
        logger.error(body);
      }
    }
  );
};

/**
 * @param {String} streamName
 */
CMApiClient.prototype.unsubscribe = function(streamName) {
  request.post(this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.unsubscribe',
    {form: {streamName: streamName}},
    _responseHandler
  );
};

/**
 * @param {String} sessionId
 */
CMApiClient.prototype.authPublish = function(sessionId) {
  request.post(this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.authPublish',
    {form: {sessionId: sessionId}},
    _responseHandler
  );
};

/**
 * @param {String} sessionId
 */
CMApiClient.prototype.authSubscribe = function(sessionId) {
  request.post(this.baseUrl + '/rpc/CM_Janus_RpcEndpoints.authSubscribe',
    {form: {sessionId: sessionId}},
    _responseHandler
  );
};

module.exports = CMApiClient;
