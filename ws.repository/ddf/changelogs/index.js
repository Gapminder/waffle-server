'use strict';

require('./changelogs.model');
const Repository = require('./changelogs.repository');

/**
 * Register Changelogs repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Changelogs', new Repository());
