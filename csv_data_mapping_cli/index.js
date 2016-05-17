'use strict';

const appStub = {
  get: function (moduleName) {
    return this[moduleName];
  },
  set: function (moduleName, module) {
    return this[moduleName] = module;
  }
};
const config = require('../ws.config/config')(appStub);
const logger = require('../ws.config/log')(appStub);
const _ = require('lodash');
const ddfModels = [
  'concepts',
  'data-points',
  'dataset-transactions',
  'datasets',
  'entities',
  'original-entities',
  'users'
];
appStub.set('ddfModels', ddfModels);

require('../ws.config/db.config')(appStub);

var mongoose = require('mongoose');

// import models
require('../ws.repository/geo.model');
require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/dimension-values/dimension-values.model');
// require('../ws.repository/translations.model');
require('../ws.repository/indicators/indicators.model');
require('../ws.repository/indicator-values/indicator-values.model');
require('../ws.repository/indexTree.model');
require('../ws.repository/indexDb.model');

_.forEach(ddfModels, model => require(`../ws.repository/ddf/${model}/${model}.model`));

const mappingImporters = {
  'ddf-world': 'import-ddf1',
  'ddf-world2': 'import-ddf2',
  'ddf-open-numbers': 'import',
  'metadata': 'import-metadata',
  'export-neo4j': '../ws.routes/graphs/export.service'
};
const defaultImporter = 'ddf-world';
let selectedImporter = mappingImporters[process.env.ACTION] || mappingImporters[defaultImporter];

require('./' + selectedImporter)(appStub, (err) => {
  if (err) {
    logger.error(err);
  }

  mongoose.disconnect();

  process.exit(0);
});
