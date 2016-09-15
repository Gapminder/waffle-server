'use strict';

const _ = require('lodash');

const config = require('../ws.config/config');
const logger = require('../ws.config/log');

require('../ws.config/db.config');
const mongoose = require('mongoose');

const ddfModels = [
  'dataset-index',
  'concepts',
  'data-points',
  'dataset-transactions',
  'datasets',
  'entities',
  'original-entities',
  'users',
  'translations'
];

_.forEach(ddfModels, model => require(`../ws.repository/ddf/${model}/${model}.model`));

const mappingImporters = {
  'ddf-world2': 'import-ddf2',
  'metadata': 'import-metadata',
  'incremental-update': 'incremental-update-ddf2'
};

const selectedImporter = mappingImporters[process.env.ACTION] || mappingImporters['ddf-world2'];

// FIXME: {} is not valid argument, cause not all importers have defaults for absent options
require('./' + selectedImporter)({}, err => {
  if (err) {
    logger.error(err);
  }

  mongoose.disconnect();

  process.exit(0);
}, {});
