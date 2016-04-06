'use strict';

let name = 'DataSets';
require('./data-sets.model');
let Repository = require('./data-sets.repository');

/**
 * Register Data Sets repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set(name, new Repository());
