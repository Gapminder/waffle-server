'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const common = require('./../common');
const config = require('../../ws.config/config');
const ddfImportUtils = require('../import-ddf.utils');

const createDatasetIndex = require('./../import-dataset-index.service');
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
    mapFilenameToCollectionName: {
      concepts: 'Concepts',
      datapoints: 'DataPoints',
      entities: 'Entities'
    },
    commit: options.commit,
    datasetName: options.datasetName,
    config,
    lifecycleHooks: options.lifecycleHooks,
    user: options.user
  };

  console.time(INCREMENTAL_UPDATE_LABEL);
  async.waterfall([
    async.constant(pipe),
    common.resolvePathToDdfFolder,
    common.createTransaction,
    findDataset,
    common.establishTransactionForDataset,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    // updateConcepts,
    getAllConcepts,
    getAllPreviousConcepts,
    updateEntities,
    updateDatapoints,
    // updateTranslations,
    createDatasetIndex,
    common.closeTransaction
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
