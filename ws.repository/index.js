'use strict';

const _ = require('lodash');

/**
 * @namespace Models
 */

/**
 * Models and repository bootstrap
 * @param {ServiceLocatorContainer} serviceLocator - express serviceLocator2 instance
 * @returns {void} - nothing
 */
module.exports = function (serviceLocator) {
  // system
  require('./files.model');

  require('./dimension-values')(serviceLocator.repositories);
  require('./dimensions')(serviceLocator.repositories);

  // indicators
  require('./indicator-values')(serviceLocator.repositories);
  require('./indicators')(serviceLocator.repositories);

  // geo
  require('./geo.model');
  require('./translations.model');
  require('./indexTree.model');
  require('./indexDb.model');

  const ddfModels = [
    'users',
    'concepts',
    'data-points',
    'dataset-transactions',
    'datasets',
    'entities',
    'original-entities'
  ];

  _.forEach(ddfModels, (model) => {
    require(`./ddf/${model}`)(serviceLocator.repositories);
  });
};
