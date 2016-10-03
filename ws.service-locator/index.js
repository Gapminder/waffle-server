'use strict';

let serviceLocator;
module.exports = function (application) {
  if (!application && !serviceLocator) {
    throw new Error('Please, supply instance of express application to a constructor of ServiceLocator');
  }

  if (application && !serviceLocator) {
    serviceLocator = new ServiceLocator('waffle-server', application);
  }

  return serviceLocator;
};

function ServiceLocator(namePrefix, application) {
  const _delimeter = '.';
  const _application = application;
  const _namePrefix = namePrefix + _delimeter;
  const servicesList = [];

  this.set = function registerRepositoryInstance(name, instance) {
    _application.set(_namePrefix + name, instance);
    servicesList.push(name);
    return this;
  };

  this.get = function getRepositoryInstance(name) {
    return _application.get(_namePrefix + name);
  };

  this.list = function listRegisteredServices() {
    return servicesList;
  };

  this.getApplication = function () {
    return _application;
  };
}
