'use strict';

var name = 'data-source-types';
require('./data-source-types.model');
var Repository = require('./data-source-types.repository');

/**
 * Register Data Source repository and MongoDB model
 * @param {RepositoryServiceLocator} serviceLocator - repository service locator
 * @returns {RepositoryServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, Repository);
};
