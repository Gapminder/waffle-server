'use strict';

module.exports = function (serviceLocator) {
  require('./datapoints.controller')(serviceLocator);
};

