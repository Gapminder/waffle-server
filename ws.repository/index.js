'use strict';
/**
 * @namespace Models
 */

/**
 * Models and repository bootstrap
 * @param {ServiceLocator} serviceLocator - express serviceLocator2 instance
 * @returns {void} - nothing
 */
module.exports = function (serviceLocator) {
  require('./data-source-types')(serviceLocator);
  require('./data-sources')(serviceLocator);
  require('./import-data')(serviceLocator);
  require('./import-sessions')(serviceLocator);
  require('./users')(serviceLocator);
};
