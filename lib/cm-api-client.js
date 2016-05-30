var serviceLocator = require('./service-locator');
var requestPromise = require('request-promise');
var JanusError = require('./janus/error');
var Context = require('./context');

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
 * @param {Context} context
 * @returns {Promise}
 * @private
 */
CMApiClient.prototype._request = function(action, data, context) {
  var requestContext = new Context();
  if (context) {
    requestContext.merge(context);
  }
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
  requestContext.extend({
    httpRequest: {
      method: options.method,
      uri: options.uri,
      body: options.body
    }
  });

  return this._requestPromise(options)
    .catch(function(reason) {
      requestContext.extend({exception: reason});
      serviceLocator.get('logger').warn('cm-api request failed', requestContext);
      throw new JanusError.CmApi(reason.message);
    })
    .then(function(response) {
      requestContext.extend({janus: {response: response}});
      if (!response || (!response['error'] && !response['success'])) {
        serviceLocator.get('logger').error('cm-api unexpected response', requestContext);
        throw new JanusError.CmApi('Unexpected response format');
      }
      var error = response['error'];
      if (error) {
        serviceLocator.get('logger').warn('cm-api error response', requestContext);
        throw new JanusError.CmApi(error['type'] + '. ' + error['msg']);
      }
      serviceLocator.get('logger').debug('cm-api call', requestContext);
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
  ], stream.getContext());
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
  ], stream.getContext());
};

/**
 * @param {Stream} stream
 * @returns {Promise}
 */
CMApiClient.prototype.removeStream = function(stream) {
  return this._request('removeStream', [
    stream.channel.name,
    stream.id
  ], stream.getContext());
};

/**
 * @returns {Promise}
 */
CMApiClient.prototype.removeAllStreams = function() {
  return this._request('removeAllStreams', [], new Context());
};

module.exports = CMApiClient;
