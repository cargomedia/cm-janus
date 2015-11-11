function ServiceManager() {
  this.services = {};
}

ServiceManager.prototype.get = function(name) {
  if (!this.services[name]) {
    throw new Error('Service `' + name + '` not found');
  }
  return this.services[name];
};

ServiceManager.prototype.set = function(name, instance) {
  if (instance instanceof Function) {
    instance = instance();
  }
  this.services[name] = instance;
};

module.exports = new ServiceManager();
