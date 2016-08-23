'use strict';

const _ = require('lodash');

/**
 * Models and repository bootstrap
 */
module.exports = function () {
  require('./files.model');
  require('./dimension-values/dimension-values.model');
  require('./dimensions/dimensions.model');
  require('./indicator-values/indicator-values.model');
  require('./indicators/indicators.model');
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
    'dataset-index',
    'entities',
    'original-entities'
  ];

  _.forEach(ddfModels, (model) => {
    require(`./ddf/${model}/${model}.model`);
  });
};
