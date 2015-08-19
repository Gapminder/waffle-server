'use strict';

module.exports = function (serviceLocator) {
  require('./api/collections')(serviceLocator);
  require('./api/cyper')(serviceLocator);
  require('./api/dimensions')(serviceLocator);
  require('./api/dimension-values')(serviceLocator);
  require('./api/spreadsheet')(serviceLocator);
  require('./api/import')(serviceLocator);
  require('./api/publishers')(serviceLocator);
  require('./api/publisher-catalogs')(serviceLocator);
  require('./api/publisher-catalog-versions')(serviceLocator);
  require('./auth')(serviceLocator);
};
