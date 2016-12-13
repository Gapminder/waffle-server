'use strict';

const _ = require('lodash');
const async = require('async');

const config = require('../ws.config/config');
const logger = require('../ws.config/log');
const ddfImportUtils = require('./utils/import-ddf.utils.js');
const importEntities = require('./import-entities');
const importConcepts = require('./import-concepts');
const importDatapoints = require('./import-datapoints');
const importTranslations = require('./import-translations');
const createDatasetIndex = require('./import-dataset-index');

const DATASET_IMPORT_LABEL = 'Dataset import';

module.exports = (options, done) => {
  const pipe = _.extend(_.pick(options, [
    'github',
    'datasetName',
    'commit',
    'user',
    'lifecycleHooks'
  ]), {raw: {}});

  console.time(DATASET_IMPORT_LABEL);
  async.waterfall([
    async.constant(pipe),
    ddfImportUtils.resolvePathToDdfFolder,
    ddfImportUtils.createTransaction,
    ddfImportUtils.createDataset,
    ddfImportUtils.establishTransactionForDataset,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    ddfImportUtils.cloneDdfRepo,
    ddfImportUtils.validateDdfRepo,
    ddfImportUtils.getDatapackage,
    ddfImportUtils.updateTransactionLanguages,
    importConcepts,
    importEntities,
    importDatapoints,
    importTranslations,
    createDatasetIndex,
    ddfImportUtils.closeTransaction
  ], (importError, pipe) => {
    console.timeEnd(DATASET_IMPORT_LABEL);

    if (importError && _.get(pipe, 'transaction')) {
      return done(importError, {transactionId: pipe.transaction._id});
    }

    return done(importError, {
      datasetName: pipe.datasetName,
      version: _.get(pipe.transaction, 'createdAt'),
      transactionId: _.get(pipe.transaction, '_id')
    });
  });
};

