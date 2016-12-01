'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const config = require('../../ws.config/config');
const logger = require('../../ws.config/log');
const ddfImportUtils = require('../utils/import-ddf.utils');
const updateConcepts = require('./update-concepts');
const updateEntities = require('./update-entities');
const updateDatapoints = require('./update-datapoints');
const createDatasetIndex = require('../import-dataset-index');
const updateEntityTranslations = require('./translations/update-entity-translations');
const updateConceptTranslations = require('./translations/update-concept-translations');

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
    updateConceptTranslations,
    updateEntityTranslations,
    createDatasetIndex,
    ddfImportUtils.closeTransaction
  ], (updateError, pipe) => {
    console.timeEnd(DATASET_INCREMENTAL_UPDATE_LABEL);

    if (updateError && pipe.transaction) {
      return done(updateError, {transactionId: pipe.transaction._id});
    }

    if (updateError) {
      logger.error(updateError);
      return done(updateError);
    }

    return done(updateError, {
      datasetName: _.get(pipe.dataset, 'name'),
      version: _.get(pipe.transaction, 'createdAt'),
      transactionId: _.get(pipe.transaction, '_id')
    });
  });
};
