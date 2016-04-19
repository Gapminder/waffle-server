'use strict';

let name = 'Datasets';
require('./datasets.model');
let Repository = require('./datasets.repository');

/**
 * Register Data Sets repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set(name, new Repository());
