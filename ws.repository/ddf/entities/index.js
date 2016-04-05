'use strict';

var name = 'Entities';
require('./entities.model');
var Repository = require('./entities.repository');

/**
 * Register Entities repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
