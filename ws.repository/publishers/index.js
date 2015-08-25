'use strict';

var name = 'Publishers';
require('./publishers.model');
var Repository = require('./publishers.repository');

/**
 * Register Publishers repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
