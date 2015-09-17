module.exports = function (serviceLocator) {
  require('./api/collections')(serviceLocator);
  require('./api/cyper')(serviceLocator);
  require('./api/dimensions')(serviceLocator);
  require('./api/dimension-values')(serviceLocator);
  require('./api/indicators')(serviceLocator);
  require('./api/indicator-values')(serviceLocator);
  require('./api/spreadsheet')(serviceLocator);
  require('./api/import')(serviceLocator);
  require('./api/publishers')(serviceLocator);
  require('./api/publisher-catalogs')(serviceLocator);
  require('./api/publisher-catalog-versions')(serviceLocator);
  require('./api/charts')(serviceLocator);

  require('./auth')(serviceLocator);
  require('./users')(serviceLocator);

  require('./file-management')(serviceLocator);
  require('./pipes')(serviceLocator);
};
