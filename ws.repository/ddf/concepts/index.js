'use strict';

require('./concepts.model');
const Repository = require('./concepts.repository');

/**
 * Register Concepts repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Concepts', new Repository());
