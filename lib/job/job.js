var _ = require('underscore');

function Job(filecontent) {
  _.extend(this, JSON.parse(filecontent));
}

module.exports = Job;
