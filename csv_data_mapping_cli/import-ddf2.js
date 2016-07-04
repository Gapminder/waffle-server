'use strict';

const async = require('async');

const ddfImportProcess = require('../ws.utils/ddf-import-process');

const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time', 'age'];
const defaultMeasureTypes = ['measure'];

module.exports = function (app, done, options) {
  const config = app.get('config');
  const common = require('./common')(app, done);

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
    // resolvePathToTranslations,
    common.createTransaction,
    ddfImportProcess.activateLifecycleHook('onTransactionCreated'),
    common.createDataset,
    common.updateTransaction,
    common.createConcepts,
    common.createEntities,
    common.createDataPoints,
    common.updateConceptsDimensions,
    // common.findLastDataset,
    // common.findLastVersion,
    // common.getAllConcepts,
    // common.createTranslations,
    // common.findDataPoints,
    // common.updateConceptsDimensions
    common.closeTransaction
  ], (importError, pipe) => {
    console.timeEnd('done');

    if (importError && pipe.transaction) {
      return done(importError, {transactionId: pipe.transaction._id});
    }
    
    return done(importError, {datasetName: pipe.datasetName, version: pipe.transaction.createdAt, transactionId: pipe.transaction._id});
  });
};
