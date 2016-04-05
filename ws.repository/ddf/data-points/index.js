'use strict';

var name = 'DataPoints';
require('./data-points.model');
var Repository = require('./data-points.repository');

/**
 * Register Data Points repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
