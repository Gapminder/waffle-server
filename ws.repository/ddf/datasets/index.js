'use strict';

require('./datasets.model');
const Repository = require('./datasets.repository');

/**
 * Register Data Sets repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Datasets', Repository);
