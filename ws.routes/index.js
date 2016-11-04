'use strict';

module.exports = function (serviceLocator) {
  require('./adapter')(serviceLocator);
  require('./swagger-jsdoc')(serviceLocator);
  require('./ddf/datapoints')(serviceLocator);
  require('./ddf/entities')(serviceLocator);
  require('./ddf/concepts')(serviceLocator);
  require('./ddf/ddfql')(serviceLocator);
  require('./ddf/cli')(serviceLocator);
};

