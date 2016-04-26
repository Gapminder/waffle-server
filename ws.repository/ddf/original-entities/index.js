'use strict';

let name = 'OriginalEntities';
require('./original-entities.model');
let Repository = require('./original-entities.repository');

/**
 * Register Original Entities repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set(name, new Repository());
