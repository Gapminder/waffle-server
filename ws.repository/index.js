'use strict';
var _ = require('lodash');
var path = require('path');

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
  require('./users')(serviceLocator.repositories);

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
    'concepts',
    'data-points',
    'dataset-versions',
    'dataset-transactions',
    'datasets',
    'entities',
    'original-entities',
    'changelogs',
    'eventlogs'
  ];

  _.forEach(ddfModels, model => {
    require(`./ddf/${model}`)(serviceLocator.repositories);
  });
};
