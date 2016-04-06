'use strict';

let name = 'Entities';
require('./entities.model');
let Repository = require('./entities.repository');

/**
 * Register Entities repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set(name, new Repository());
