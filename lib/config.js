var yaml = require('js-yaml');
var fs = require('fs');
var Validator = require('jsonschema').Validator;

function Config() {
  this._hash = {};
}

/**
 * @param {String} path
 */
Config.prototype.load = function(path) {
  var content = yaml.safeLoad(fs.readFileSync(path, 'utf8'));
  Config._validate(content);
  this._hash = content;
};

/**
 * @returns {Object}
 */
Config.prototype.asHash = function() {
  return this._hash;
};

var validator = new Validator();

var validScheme = {
  type: 'object',
  additionalProperties: false,
  properties: {
    app: {
      type: 'object',
      required: true,
      properties: {
        logPath: {
          type: 'string',
          required: true
        }
      }
    },
    httpServer: {
      type: 'object',
      required: true,
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
    proxy: {
      type: 'object',
      required: true,
      properties: {
        listenPort: {
          type: 'integer',
          required: true
        },
        janusAddress: {
          type: 'string',
          required: true
        }
      }
    },
    cmApi: {
      type: 'object',
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
    }
  }
};

/**
 * @param {Object} config
 */
Config._validate = function(config) {
  var result = validator.validate(config, validScheme, {propertyName: 'config'});
  if (result.errors.length) {
    throw new Error(result.errors.join(';\n'));
  }
};

Config.createFromFile = function(path) {
  var config = new Config();
  config.load(path);
  return config;
};

module.exports = Config;
