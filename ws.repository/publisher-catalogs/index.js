'use strict';

var name = 'publisher-catalogs';
require('./publisher-catalogs.model');
var Repository = require('./publisher-catalogs.repository');

/**
 * Register Publisher Catalogs repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
