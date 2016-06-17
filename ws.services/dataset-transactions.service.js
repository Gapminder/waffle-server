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

    const tasks =
      _.chain([DataPoints, Entities, Concepts])
        .map(model => [rollbackRemovedTask(model, failedTransaction.createdAt), rollbackNewTask(model, failedTransaction.createdAt)])
        .flatten()
        .map(rollbackTask => (done => async.retry(retryConfig, rollbackTask, done)))
        .value();

    async.waterfall([
      done => async.parallelLimit(tasks, numOfTasksExecutedInParallel, done),
      done => DatasetTransactions.remove({_id: failedTransaction._id}, done),
      done => Datasets.update({_id: failedTransaction.dataset}, {$pull: {versions: failedTransaction.createdAt}}).lean().exec(done)
    ], onRollbackCompleted);
  });

  function rollbackRemovedTask(model, versionToRollback) {
    return done => model.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done);
  }

  function rollbackNewTask(model, versionToRollback) {
    return done => model.remove({from: versionToRollback}, done);
  }
}

function findLatestTransactionByQuery(query, done) {
  return DatasetTransactions
    .find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error, transaction) => {
      return done(error, transaction);
    });
}

function findDatasetByName(datasetName, done) {
  return Datasets
    .findOne({name: datasetName})
    .lean()
    .exec((error, dataset) => {
      return done(error, dataset);
    });
}

function findLatestFailedTransactionByDatasetName(datasetName, done) {
  return findDatasetByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found for the given name: ${datasetName}`);
    }

    return findLatestTransactionByQuery({dataset: dataset._id, isClosed: false}, done);
  })
}
