var path = require('path');
module.exports = function(libraryPath) {
  return require(path.join(__dirname, libraryPath));
};
