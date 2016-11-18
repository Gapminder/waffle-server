'use strict';

const async = require('async');

const config = require('../ws.config/config');
const ddfImportUtils = require('./utils/import-ddf.utils.js');
const importDatapoints = require('./import-datapoints');
const importEntities = require('./import-entities');
const importConcepts = require('./import-concepts');
const createDatasetIndex = require('./import-dataset-index');

module.exports = (options, done) => {

  const pipe = {
    raw: {},
    config,
    github: options.github,
    datasetName: options.datasetName,
    commit: options.commit,
    user: options.user,
    lifecycleHooks: options.lifecycleHooks
  };

  console.time('done');
  async.waterfall([
    async.constant(pipe),
    ddfImportUtils.resolvePathToDdfFolder,
    ddfImportUtils.getDatapackage,
    ddfImportUtils.createTransaction,
    ddfImportUtils.createDataset,
    ddfImportUtils.activateLifecycleHook('onDatasetCreated'),
    ddfImportUtils.establishTransactionForDataset,
    importConcepts,
    importEntities,
    importDatapoints,
    createDatasetIndex,
    ddfImportUtils.closeTransaction
  ], (importError, pipe) => {
    console.timeEnd('done');

    if (importError && pipe.transaction) {
      return done(importError, {transactionId: pipe.transaction._id});
    }

    return done(importError, {datasetName: pipe.datasetName, version: pipe.transaction.createdAt, transactionId: pipe.transaction._id});
  });
};

