var yaml = require('js-yaml');
var fs = require('fs');
var _ = require('underscore');
var Validator = require('jsonschema').Validator;

function Config(path) {
  var content = yaml.safeLoad(fs.readFileSync(path, 'utf8'));
  Config._validate(content);
  this._hash = content;
}

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
          type: 'number',
          required: true
        },
        apiKey: {
          type: 'string',
          required: true
        }
      }
    },
    cmHttpClient: {
      type: 'object',
      properties: {
        cmUrl: {
          type: 'uri',
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

module.exports = Config;
