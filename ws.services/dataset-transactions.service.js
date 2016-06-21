'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const constants = require('../ws.utils/constants');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');
const Datasets = mongoose.model('Datasets');
const DatasetTransactions = mongoose.model('DatasetTransactions');

const DatasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository')();
const TransactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository')();

module.exports = {
  rollback
};

function rollback(datasetName, onRollbackCompleted) {
  const numOfTasksExecutedInParallel = 10;
  const retryConfig = {times: 3, interval: 3000};

  return findLatestFailedTransactionByDatasetName(datasetName, (error, failedTransaction) => {
    if (!failedTransaction) {
      return onRollbackCompleted();
    }

    const rollbackTasks =
      _.chain([DataPoints, Entities, Concepts])
        .map(model => [rollbackRemovedTask(model, failedTransaction.createdAt), rollbackNewTask(model, failedTransaction.createdAt)])
        .flatten()
        .map(rollbackTask => (done => async.retry(retryConfig, rollbackTask, done)))
        .value();

    async.waterfall([
      done => async.parallelLimit(rollbackTasks, numOfTasksExecutedInParallel, done),
      done => TransactionsRepository.deleteRecord(failedTransaction._id, done),
      done => DatasetsRepository.removeVersion(failedTransaction.dataset, failedTransaction.createdAt, done)
    ], onRollbackCompleted);
  });

  function rollbackRemovedTask(model, versionToRollback) {
    return done => model.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done);
  }

  function rollbackNewTask(model, versionToRollback) {
    return done => model.remove({from: versionToRollback}, done);
  }
}

function findLatestFailedTransactionByDatasetName(datasetName, done) {
  return DatasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found for the given name: ${datasetName}`);
    }

    return TransactionsRepository.findLatestByQuery({dataset: dataset._id, isClosed: false}, done);
  })
}
