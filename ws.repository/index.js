'use strict';
/**
 * @namespace Models
 */

/**
 * @typedef {Object} Dimension
 * @memberof Models
 *
 * @param {ObjectId|String} d - dimension name or reference of dimension
 * @param {String|Number} v - value of dimension pointer
 */

/**
 * Models and repository bootstrap
 * @param {app} app - express app instance
 * @returns {Object} -
 */
module.exports = function (app) {
  var repositories = require('require-dir')('.');
  var repositoryServiceLocator = new RepositoryServiceLocator(app);
  _.each(repositories, function (repo) {
    return repo(repositoryServiceLocator);
  });
};

/**
 * {null} RepositoryServiceLocator
 * @param {app} app - express app instance
 * @constructor
 */
function RepositoryServiceLocator(app) {
  /*eslint no-underscore-dangle: 0*/
  /** @private */
  var _app = app;
  /** @private */
  var _namePrefix = 'repository.';

  /**
   * Registers repository instance, sync
   *
   * @param {String} name - repository name
   * @param {Object} instance - instance of repository
   * @returns {RepositoryServiceLocator} - this, for chainable calls
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
