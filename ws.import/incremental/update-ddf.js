'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const config = require('../../ws.config/config');
const ddfImportUtils = require('../utils/import-ddf.utils');

const createDatasetIndex = require('../import-dataset-index');
const datasetsRepository = require('../../ws.repository/ddf/datasets/datasets.repository');
const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const updateConcepts = require('./update-concepts');
const updateEntities = require('./update-entities');
const updateDatapoints = require('./update-datapoints');
const updateTranslations = require('./update-translations');

const INCREMENTAL_UPDATE_LABEL = 'Dataset incremental update';

module.exports = function (options, done) {

  const pipe = {
    pathToLangDiff: options.pathToLangDiff,
    pathToDatasetDiff: options.pathToDatasetDiff,
    commit: options.commit,
    datasetName: options.datasetName,
    config,
    lifecycleHooks: options.lifecycleHooks,
    user: options.user
  };

  console.time(INCREMENTAL_UPDATE_LABEL);
  async.waterfall([
    async.constant(pipe),
    ddfImportUtils.resolvePathToDdfFolder,
    ddfImportUtils.getDatapackage,
    ddfImportUtils.createTransaction,
    findDataset,
    ddfImportUtils.establishTransactionForDataset,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    updateConcepts,
    getAllConcepts,
    getAllPreviousConcepts,
    updateEntities,
    updateDatapoints,
    // updateTranslations,
    createDatasetIndex,
    ddfImportUtils.closeTransaction
  ], (updateError, pipe) => {
    console.timeEnd(INCREMENTAL_UPDATE_LABEL);

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

function findDataset(pipe, done) {
  return datasetsRepository.findByName(pipe.datasetName, (err, dataset) => {
    pipe.dataset = dataset;
    return done(err, pipe);
  });
}

function getAllConcepts(pipe, done) {
  return conceptsRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.concepts = _.keyBy(res, 'gid');
      return done(err, pipe);
    });
}

function getAllPreviousConcepts(pipe, done) {
  return conceptsRepositoryFactory.previousVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.previousConcepts = _.keyBy(res, 'gid');
      return done(err, pipe);
    });
}
