'use strict';

module.exports = function (serviceLocator) {
  require('./api/collections')(serviceLocator);
  require('./api/cyper')(serviceLocator);
  require('./api/spreadsheet')(serviceLocator);
  require('./api/import')(serviceLocator);
  require('./api/publishers')(serviceLocator);
  require('./api/publisher-catalogs')(serviceLocator);
  require('./auth')(serviceLocator);
};
