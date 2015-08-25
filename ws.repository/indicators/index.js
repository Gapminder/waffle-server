'use strict';

var name = 'Indicators';
require('./indicators.model');
var Repository = require('./indicators.repository');

/**
 * Register Indicators repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
