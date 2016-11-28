'use strict';

module.exports = function (serviceLocator) {
  require('./adapter')(serviceLocator);
  require('./ddf/ddfql')(serviceLocator);
  require('./mongodb-documents')(serviceLocator);
  require('./ddf/cli')(serviceLocator);
};

