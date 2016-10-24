'use strict';

const async = require('async');

const ddfImportUtils = require('./import-ddf.utils');
const createDatasetIndex = require('./import-dataset-index.service');
const importTranslations = require('./import-translations.service');

const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time', 'age'];
const defaultMeasureTypes = ['measure'];
const common = require('./common');
const importDatapoints = require('./import-ddf-datapoints.service');
const config = require('../ws.config/config');

module.exports = function (options, done) {

  let pipe = {
    raw: {},
    config,
    defaultEntityGroupTypes,
    defaultMeasureTypes,
    github: options.github || process.env.GITHUB_DDF_REPO,
    datasetName: options.datasetName || process.env.DDF_DATASET_NAME,
    commit: options.commit || process.env.DDF_REPO_COMMIT,
    user: options.user,
    lifecycleHooks: options.lifecycleHooks
  };

  console.time('done');
  async.waterfall([
    async.constant(pipe),
    common.resolvePathToDdfFolder,
    common.createTransaction,
    common.createDataset,
    ddfImportUtils.activateLifecycleHook('onDatasetCreated'),
    common.updateTransaction,
    common.createConcepts,
    common.createEntities,
    importDatapoints,
    common.updateConceptsDimensions,
    importTranslations,
    createDatasetIndex,
    common.closeTransaction
  ], (importError, pipe) => {
    console.timeEnd('done');

    if (importError && pipe.transaction) {
      return done(importError, {transactionId: pipe.transaction._id});
    }

    return done(importError, {datasetName: pipe.datasetName, version: pipe.transaction.createdAt, transactionId: pipe.transaction._id});
  });
};

