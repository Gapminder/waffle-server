'use strict';

var name = 'data-sources';
require('./data-sources.model');
var Repository = require('./data-sources.repository');

/**
 * Register Data Source repository and MongoDB model
 * @param {ServiceLocatorFactory} serviceLocator - repository service locator
 * @returns {ServiceLocatorFactory} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, Repository);
};
