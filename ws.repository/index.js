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
  // system
  require('./users')(serviceLocator.repositories);

  // data source
  require('./data-source-types')(serviceLocator.repositories);
  require('./data-sources')(serviceLocator.repositories);

  // import
  require('./import-data')(serviceLocator.repositories);
  require('./import-sessions')(serviceLocator.repositories);

  // schema analysis
  require('./analysis-sessions')(serviceLocator.repositories);
  require('./dimensions')(serviceLocator.repositories);
  require('./dimension-values')(serviceLocator.repositories);

  // indicators
  require('./coordinates')(serviceLocator.repositories);
  require('./indicators')(serviceLocator.repositories);
  require('./indicator-values')(serviceLocator.repositories);

  // publishers
  require('./publishers')(serviceLocator.repositories);
  require('./publisher-catalogs')(serviceLocator.repositories);
};
