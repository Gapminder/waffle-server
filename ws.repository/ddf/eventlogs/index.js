'use strict';

require('./eventlogs.model');
const Repository = require('./eventlogs.repository');

/**
 * Register Eventlogs repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Eventlogs', new Repository());
