'use strict';

module.exports = function (serviceLocator) {
  require('./import.controller')(serviceLocator);
  require('./repos.controller')(serviceLocator);
};
