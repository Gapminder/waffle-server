'use strict';

var name = 'IndicatorValues';
require('./indicator-values.model');
var Repository = require('./indicator-values.repository');

/**
 * Register Indicator Values repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
