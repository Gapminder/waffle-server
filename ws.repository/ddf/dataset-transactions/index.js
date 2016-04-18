'use strict';

require('./dataset-transactions.model');
const Repository = require('./dataset-transactions.repository');

/**
 * Register Dataset Transaction repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('DatasetTransaction', new Repository());
