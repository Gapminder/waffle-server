'use strict';

require('./data-set-sessions.model');
const Repository = require('./data-set-sessions.repository');

/**
 * Register Data Set Sessions repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('DataSetSessions', new Repository());
