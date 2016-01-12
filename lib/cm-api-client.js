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
 * @param {Stream} stream
 * @returns {Promise}
 */
CMApiClient.prototype.publish = function(stream) {
  return this._request('publish', [
    stream.channel.name,
    stream.id,
    stream.start.getTime() / 1000,
    stream.plugin.session.data,
    stream.channel.data
  ]);
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
CMApiClient.prototype.subscribe = function(stream) {
  return this._request('subscribe', [
    stream.channel.name,
    stream.id,
    stream.start.getTime() / 1000,
    stream.plugin.session.data,
    stream.channel.data
  ]);
};

/**
 * @param {Stream} stream
 */
CMApiClient.prototype.removeStream = function(stream) {
  return this._request('removeStream', [
    stream.channel.name,
    stream.id
  ]);
};

module.exports = CMApiClient;
