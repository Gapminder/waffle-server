'use strict';

require('./vizabi-translations.model');
const Repository = require('./vizabi-translations.repository');

/**
 * Register Vizabi Translations repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('VizabiTranslations', new Repository());
