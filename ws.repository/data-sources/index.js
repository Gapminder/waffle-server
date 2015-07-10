'use strict';

var name = 'data-sources';
require('./data-sources.model');
var Repository = require('./data-sources.repository');

/**
 * Register Data Source repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
