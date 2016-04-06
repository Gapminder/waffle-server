'use strict';

require('./versions.model');
const Repository = require('./versions.repository');

/**
 * Register Versions repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Versions', new Repository());
