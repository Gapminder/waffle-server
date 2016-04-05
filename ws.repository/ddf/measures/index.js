'use strict';

var name = 'Measures';
require('./measures.model');
var Repository = require('./measures.repository');

/**
 * Register Measures repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
