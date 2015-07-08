'use strict';

/**
 * Register Main Service Locator
 * @param {app} app - express app instance
 * @return {ServiceLocator} - instance of service locator
 */
module.exports = function (app) {
  var serviceLocator = new ServiceLocator(app);
  app.set('ServiceLocator', serviceLocator);
  return serviceLocator;
};

function ServiceLocator(app) {
  this.repositories = new ServiceLocatorFactory('repository', app);
}

/**
 * {null} ServiceLocatorFactory
 * @param {String} namePrefix - prefix to be used for service name change
 * @param {app} app - express app instance
 * @private
 * @constructor
 */
function ServiceLocatorFactory(namePrefix, app) {
  /*eslint no-underscore-dangle: 0*/
  var _delimeter = '.';
  /** @private */
  var _app = app;
  /** @private */
  var _namePrefix = namePrefix + _delimeter;

  /**
   * Registers repository instance, sync
   *
   * @param {String} name - repository name
   * @param {Object} instance - instance of repository
   * @returns {ServiceLocatorFactory} - this, for chainable calls
   */
  this.set = function registerRepositoryInstance(name, instance) {
    _app.set(_namePrefix + name, instance);
    return this;
  };

  /** Get repository instance, sync
   *
   * @param {String} name - of repository
   * @return {Object} - instance of repository
   */
  this.get = function getRepositoryInstance(name) {
    return _app.get(_namePrefix + name);
  };
}

/**
 * @typedef {Object} Dimension
 * @memberof Models
 *
 * @param {ObjectId|String} d - dimension name or reference of dimension
 * @param {String|Number} v - value of dimension pointer
 */
