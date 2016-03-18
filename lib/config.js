var yaml = require('js-yaml');
var fs = require('fs');
var Validator = require('jsonschema').Validator;

function Config() {
  this._hash = {};
  this._validator = new Validator();
}

/**
 * @param {String} path
 */
Config.prototype.load = function(path) {
  var content = yaml.safeLoad(fs.readFileSync(path, 'utf8'));
  this.validate(content);
  this._hash = content;
};

/**
 * @returns {Object}
 */
Config.prototype.asHash = function() {
  return this._hash;
};

/**
 * @param {Object} config
 */
Config.prototype.validate = function(config) {
  var result = this._validator.validate(config, this._getValidationSchema(), {propertyName: 'config'});
  if (result.errors.length) {
    throw new Error(result.errors.join(';\n'));
  }
};

Config.prototype._getValidationSchema = function() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      logPath: {
        type: 'string',
        required: true
      },
      httpServer: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          port: {
            type: 'integer',
            required: true
          },
          apiKey: {
            type: 'string',
            required: true
          }
        }
      },
      webSocketServer: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          port: {
            type: 'integer',
            required: true
          }
        }
      },
      janus: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          webSocketAddress: {
            type: 'string',
            required: true
          },
          httpAddress: {
            type: 'string',
            required: true
          }
        }
      },
      cmApi: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          baseUrl: {
            type: 'uri',
            required: true
          },
          apiKey: {
            type: 'string',
            required: true
          }
        }
      },
      cmApplication: {
        required: true,
        type: 'object',
        additionalProperties: false,
        properties: {
          path: {
            type: 'string',
            required: true
          }
        }
      },
      jobManager: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          jobsPath: {
            type: 'string',
            required: true
          },
          tempFilesPath: {
            type: 'string',
            required: true
          },
          handlersConfiguration: {
            type: 'object',
            required: true
          }
        }
      }
    }
  };
};

Config.createFromFile = function(path) {
  var config = new Config();
  config.load(path);
  return config;
};

module.exports = Config;
