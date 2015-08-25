'use strict';

var name = 'PublisherCatalogVersions';
require('./publisher-catalog-versions.model');
var Repository = require('./publisher-catalog-versions.repository');

/**
 * Register Publisher Catalog Versions repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = function (serviceLocator) {
  return serviceLocator.set(name, new Repository());
};
