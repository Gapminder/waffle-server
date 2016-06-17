'use strict';

module.exports = serviceLocator => {
  require('./cli.controller')(serviceLocator);
};
