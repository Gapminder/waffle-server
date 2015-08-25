'use strict';

var name = 'DimensionValues';
require('./dimension-values.model');
var Repository = require('./dimension-values.repository');

/**
 * Register Dimension Values repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
