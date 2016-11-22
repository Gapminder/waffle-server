'use strict';

module.exports = function (serviceLocator) {
  require('./adapter')(serviceLocator);
  require('./ddf/ddfql')(serviceLocator);
  require('./ddf/cli')(serviceLocator);
};

