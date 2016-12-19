'use strict';

const _ = require('lodash');

/**
 * Models and repository bootstrap
 */
module.exports = (function () {
  const ddfModels = [
    'users',
    'concepts',
    'data-points',
    'dataset-transactions',
    'datasets',
    'dataset-index',
    'entities',
    'key-value',
    'recent-ddfql-queries'
  ];

  _.forEach(ddfModels, (model) => {
    require(`./ddf/${model}/${model}.model`);
  });
})();
