'use strict';

module.exports = function (serviceLocator) {
  require('./adapter')(serviceLocator);
  require('./geo')(serviceLocator);

  require('./auth')(serviceLocator);
  require('./users')(serviceLocator);
  require('./swagger-jsdoc')(serviceLocator);

  require('./file-management')(serviceLocator);
  require('./pipes')(serviceLocator);
  require('./graphs')(serviceLocator);
  require('./ddf/import')(serviceLocator);
  require('./ddf/stats')(serviceLocator);
};

