'use strict';

var name = 'EntityGroups';
require('./entity-groups.model');
var Repository = require('./entity-groups.repository');

/**
 * Register EntityGroups repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
