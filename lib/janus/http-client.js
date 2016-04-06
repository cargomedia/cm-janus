var requestPromise = require('request-promise');
var JanusConnection = require('./connection');
var Context = require('../context');
var serviceLocator = require('../service-locator');

function JanusHttpClient(url) {
  this.baseUrl = url;
}

JanusHttpClient.prototype._requestPromise = requestPromise;

/**
 * @param {String} action
 * @param {Object} [data]
 * @param {Context} [context]
 * @returns {Promise}
 * @private
 */
JanusHttpClient.prototype._request = function(action, data, context) {
  action = action || '/';
  var options = {
    method: 'POST',
    uri: this.baseUrl + action,
    json: true
  };
  if (data) {
    options.body = data;
  }
  var requestContext = new Context({
    httpRequest: {
      method: options.method,
      uri: options.uri
    }
  });
  if (context) {
    requestContext.merge(context);
  }

  serviceLocator.get('logger').info('http-client request', requestContext);
  return this._requestPromise(options)
    .catch(function(error) {
      throw new Error('http-client error: ' + error['message']);
    })
    .then(function(response) {
      requestContext.extend({response: response});
      serviceLocator.get('logger').info('http-client response', requestContext);
      if ('error' == response['janus']) {
        throw new Error('http-client error: ' + response['error']['reason']);
      }
      if (response['plugindata'] && response['plugindata']['data'] && response['plugindata']['data']['error']) {
        throw new Error('http-client error: ' + response['plugindata']['data']['error']);
      }
      return response;
    });
};

/**
 * @param {Number} sessionId
 * @param {Number} pluginId
 * @param {Context} [context]
 * @returns {Promise}
 */
JanusHttpClient.prototype.stopStream = function(sessionId, pluginId, context) {
  return this._request('/' + sessionId + '/' + pluginId, {
    body: {request: 'stop'},
    janus: 'message',
    transaction: JanusConnection.generateTransactionId()
  }, context);
};

/**
 * @param {PluginAbstract} plugin
 * @param {Context} [context]
 * @returns {Promise}
 */
JanusHttpClient.prototype.detach = function(plugin, context) {
  var requestContext = new Context();
  if (context) {
    requestContext.merge(context);
  }
  return this._request('/' + plugin.session.id + '/' + plugin.id, {
    janus: 'detach',
    transaction: JanusConnection.generateTransactionId()
  }, context);
};

module.exports = JanusHttpClient;
