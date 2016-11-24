'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const config = require('../../ws.config/config');
const ddfImportUtils = require('../utils/import-ddf.utils');
const updateConcepts = require('./update-concepts');
const updateEntities = require('./update-entities');
const updateDatapoints = require('./update-datapoints');
const createDatasetIndex = require('../import-dataset-index');
const updateTranslations = require('./update-translations');

const DATASET_INCREMENTAL_UPDATE_LABEL = 'Dataset incremental update';

module.exports = (options, done) => {
  const pipe = _.pick(options, [
    'user',
    'github',
    'commit',
    'hashFrom',
    'hashTo',
    'datasetName',
    'lifecycleHooks'
  ]);

  console.time(DATASET_INCREMENTAL_UPDATE_LABEL);
  async.waterfall([
    async.constant(pipe),
    ddfImportUtils.resolvePathToDdfFolder,
    ddfImportUtils.createTransaction,
    ddfImportUtils.findDataset,
    ddfImportUtils.establishTransactionForDataset,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    ddfImportUtils.cloneDdfRepo,
    ddfImportUtils.validateDdfRepo,
    ddfImportUtils.getDatapackage,
    ddfImportUtils.generateDiffForDatasetUpdate,
    updateConcepts,
    ddfImportUtils.getAllConcepts,
    ddfImportUtils.getAllPreviousConcepts,
    updateEntities,
    updateDatapoints,
    updateTranslations,
    createDatasetIndex,
    ddfImportUtils.closeTransaction
  ], (updateError, pipe) => {
    console.timeEnd(DATASET_INCREMENTAL_UPDATE_LABEL);

    if (updateError && pipe.transaction) {
      return done(updateError, {transactionId: pipe.transaction._id});
    }

    return done(updateError, {
      datasetName: pipe.dataset.name,
      version: pipe.transaction.createdAt,
      transactionId: pipe.transaction._id
    });
  });
};
