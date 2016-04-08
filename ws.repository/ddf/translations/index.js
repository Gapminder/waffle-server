'use strict';

require('./translations.model');
const Repository = require('./translations.repository');

/**
 * Register Translations repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Translations', new Repository());
