var serviceLocator = require('./service-locator');
var requestPromise = require('request-promise');
var JanusError = require('./janus/error');

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

  return this._requestPromise(options)
    .catch(function(reason) {
      serviceLocator.get('logger').warn('cm-api request failed', {
        error: reason.error,
        options: {uri: options.method + ' ' + options.uri, rpc: options.body.method + ' [' + options.body.params + ']'}
      });
      throw new JanusError.CmApi(reason.message);
    })
    .then(function(response) {
      var error = response['error'];
      if (error) {
        serviceLocator.get('logger').warn('cm-api error response', {
          response: response,
          options: {uri: options.method + ' ' + options.uri, rpc: options.body.method + ' [' + options.body.params + ']'}
        });
        throw new JanusError.CmApi(error['type'] + '. ' + error['msg']);
      }
      serviceLocator.get('logger').debug('cm-api call', {request: options, response: response});
      return response['success']['result'];
    });
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(stream) {
  return this._request('publish', [
    stream.plugin.session.data,
    stream.channel.name,
    stream.channel.id,
    stream.channel.data,
    stream.id,
    stream.start.getTime() / 1000
  ]);
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(stream) {
  return this._request('subscribe', [
    stream.plugin.session.data,
    stream.channel.name,
    stream.channel.id,
    stream.channel.data,
    stream.id,
    stream.start.getTime() / 1000
  ]);
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
CMApiClient.prototype.removeStream = function(stream) {
  return this._request('removeStream', [
    stream.channel.name,
    stream.id
  ]);
};

/**
 * @returns {Promise}
 */
CMApiClient.prototype.removeAllStreams = function() {
  return this._request('removeAllStreams', []);
};

module.exports = CMApiClient;
