'use strict';

module.exports = function (serviceLocator) {
  require('./adapter')(serviceLocator);
  require('./geo')(serviceLocator);
  require('./swagger-jsdoc')(serviceLocator);
  require('./graphs')(serviceLocator);
  require('./ddf/datapoints')(serviceLocator);
  require('./ddf/entities')(serviceLocator);
  require('./ddf/concepts')(serviceLocator);
  require('./ddf/cli')(serviceLocator);
};

