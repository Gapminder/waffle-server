'use strict';

require('./dataset-versions.model');
const Repository = require('./dataset-versions.repository');

/**
 * Register Data Set Versions repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('DatasetVersions', new Repository());
