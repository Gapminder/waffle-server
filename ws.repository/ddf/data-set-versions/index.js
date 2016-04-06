'use strict';

require('./data-set-versions.model');
const Repository = require('./data-set-versions.repository');

/**
 * Register Data Set Versions repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('DataSetVersions', new Repository());
