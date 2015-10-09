'use strict';

var name = 'Dimensions';
require('./dimensions.model');
var Repository = require('./dimensions.repository');

/**
 * Register Dimensions repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
