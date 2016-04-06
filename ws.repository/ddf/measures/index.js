'use strict';

let name = 'Measures';
require('./measures.model');
let Repository = require('./measures.repository');

/**
 * Register Measures repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set(name, new Repository());
