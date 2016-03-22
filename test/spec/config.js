var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');
var fs = require('fs');
var yaml = require('js-yaml');

require('../helpers/globals');
var Config = require('../../lib/config');

describe('Config', function() {

  var config;
  var configPath = './tmp-cm-janus-conf.yaml';

  context('when single configuration file', function() {

    before(function() {
      config = new Config();
      sinon.stub(config, '_getValidationSchema').returns({
        "id": "/foo",
        "type": "object",
        "required": true,
        "properties": {
          "foo": {
            "type": "string",
            "required": true
          }
        }
      });
    });

    afterEach(function() {
      fs.unlinkSync(configPath);
    });

    it('must load valid configs', function() {
      fs.writeFileSync(configPath, yaml.safeDump({foo: 'bar'}));
      config.load(configPath);
    });

    it('throw on invalid configs', function() {
      fs.writeFileSync(configPath, yaml.safeDump({foo: 4}));
      assert.throws(function() {
        config.load(configPath);
      }, 'not of a type');

      fs.writeFileSync(configPath, '');
      assert.throws(function() {
        config.load(configPath);
      }, 'required');
    });

  });

});
