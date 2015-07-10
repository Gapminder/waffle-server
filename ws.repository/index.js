'use strict';
/**
 * @namespace Models
 */

/**
 * Models and repository bootstrap
 * @param {ServiceLocatorContainer} serviceLocator - express serviceLocator2 instance
 * @returns {void} - nothing
 */
module.exports = function (serviceLocator) {
  require('./data-source-types')(serviceLocator.repositories);
  require('./data-sources')(serviceLocator.repositories);
  require('./import-data')(serviceLocator.repositories);
  require('./import-sessions')(serviceLocator.repositories);
  require('./users')(serviceLocator.repositories);
};
