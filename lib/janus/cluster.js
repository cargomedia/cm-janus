
/**
 * @param {String} address
 * @constructor
 */
function JanusCluster(address) {
  this.address = address;
}

JanusCluster.prototype.getEdgeAddress = function() {
  // do http call to cluster service (simple http service with `http://janus-cluster/get-edge-address` endpoint)
  return 'ws://edge-address';
};

module.exports = JanusCluster;
