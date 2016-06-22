'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const constants = require('../ws.utils/constants');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

const DatasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const datasetsRepository = new DatasetsRepository();

const TransactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const transactionsRepository = new TransactionsRepository();

module.exports = {
  rollbackFailedTransactionFor,
  getStatusOfLatestTransactionByDatasetName
};

function rollbackFailedTransactionFor(datasetName, onRollbackCompleted) {
  const asyncOperationsAmount = 6;
  const retryConfig = {times: 3, interval: 3000};

  return findLatestFailedTransactionByDatasetName(datasetName, (error, failedTransaction) => {
    if (error) {
      return onRollbackCompleted(error);
    }

    if (!failedTransaction) {
      return onRollbackCompleted('There is nothing to rollback - all transactions are completed successfully');
    }

    const failedVersion = failedTransaction.createdAt;

    const rollbackTasks =
      _.chain([DataPoints, Entities, Concepts])
        .map(model => [rollbackRemovedTask(model, failedVersion), rollbackNewTask(model, failedVersion)])
        .flatten()
        .map(rollbackTask => (done => async.retry(retryConfig, rollbackTask, done)))
        .value();

    async.series([
      done => datasetsRepository.lock(datasetName, done),
      done => async.parallelLimit(rollbackTasks, asyncOperationsAmount, done),
      done => transactionsRepository.deleteRecord(failedTransaction._id, done),
      done => datasetsRepository.removeVersion(datasetName, failedVersion, done),
      done => datasetsRepository.unlock(datasetName, done)
    ],
    onRollbackCompleted);
  });

  function rollbackRemovedTask(model, versionToRollback) {
    return done => model.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done);
  }

  function rollbackNewTask(model, versionToRollback) {
    return done => model.remove({from: versionToRollback}, done);
  }
}

function findLatestFailedTransactionByDatasetName(datasetName, done) {
  return datasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found for the given name: ${datasetName}`);
    }

    return transactionsRepository.findLatestByQuery({dataset: dataset._id, isClosed: false}, done);
  });
}

function getStatusOfLatestTransactionByDatasetName(datasetName, done) {
  return datasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found for the given name: ${datasetName}`);
    }

    return transactionsRepository.findLatestByQuery({dataset: dataset._id}, (error, latestTransaction) => {
      if (error || !latestTransaction) {
        return done(error || `Transaction is absent for dataset: ${datasetName}`);
      }

      const version = latestTransaction.createdAt;
      const closedOrOpenedByVersionQuery = {$or: [{from: version}, {to: version}]};

      const asyncOperationsAmount = 3;
      return async.parallelLimit({
        concepts: done => Concepts.count(closedOrOpenedByVersionQuery, done),
        entities: done => Entities.count(closedOrOpenedByVersionQuery, done),
        datapoints: done => DataPoints.count(closedOrOpenedByVersionQuery, done)
      },
      asyncOperationsAmount,
      (error, stats) => {
        if (error) {
          return done(error);
        }

        const result = {
          datasetName: datasetName,
          transaction: {
            commit: latestTransaction.commit,
            status: latestTransaction.isClosed ? 'Completed' : 'In progress',
            createdAt: new Date(latestTransaction.createdAt)
          },
          modifiedObjects: stats
        };

        return done(error, result);
      });
    });
  });
}
