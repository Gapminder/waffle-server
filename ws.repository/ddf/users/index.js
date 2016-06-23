'use strict';

require('./users.model');
const Repository = require('./users.repository');

/**
 * Register User repository and MongoDB model
 * @param {ServiceLocator} serviceLocator - repository service locator
 * @returns {ServiceLocator} - instance of locator
 */
module.exports = serviceLocator => serviceLocator.set('Users', Repository);
