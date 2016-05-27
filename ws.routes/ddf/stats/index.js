'use strict';

module.exports = function (serviceLocator) {
  require('./stats.controller')(serviceLocator);
};

