'use strict';

/**
 * Register Main Service Locator
 * @param {app} app - express app instance
 * @return {ServiceLocatorContainer} - instance of service locator
 */
module.exports = function (app) {
  // todo: use cache, to reuse on ui
  return new ServiceLocatorContainer(app);
};

function ServiceLocatorContainer(app) {
  this.repositories = new ServiceLocator('repository', app);
  this.plugins = new ServiceLocator('plugins', app);
  this.models = new ServiceLocator('model', app);
}

/**
 * ServiceLocatorFactory
 * @param {String} namePrefix - prefix to be used for service name change
 * @param {app} app - express app instance
 * @constructor
 */
function ServiceLocator(namePrefix, app) {
  /*eslint no-underscore-dangle: 0*/
  var _delimeter = '.';
  /** @private */
  var _app = app;
  /** @private */
  var _namePrefix = namePrefix + _delimeter;

  /** @private */
  var servicesList = [];

  /**
   * Registers repository instance, sync
   *
   * @param {String} name - repository name
   * @param {Object} instance - instance of repository
   * @returns {ServiceLocator} - this, for chainable calls
   */
  this.set = function registerRepositoryInstance(name, instance) {
    _app.set(_namePrefix + name, instance);
    servicesList.push(name);
    return this;
  };

  /**
   * Get repository instance, sync
   * @param {String} name - of repository
   * @return {Object} - instance of repository
   */
  this.get = function getRepositoryInstance(name) {
    return _app.get(_namePrefix + name);
  };

  /**
   * Lists names of all registered services
   * @returns {Array<String>} - list of registered services names
   */
  this.list = function listRegisteredServices() {
    return servicesList;
  };
}

/**
 * @typedef {Object} Dimension
 * @memberof Models
 *
 * @param {ObjectId|String} d - dimension name or reference of dimension
 * @param {String|Number} v - value of dimension pointer
 */
