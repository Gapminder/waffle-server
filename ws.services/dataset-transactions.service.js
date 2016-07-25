'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const constants = require('../ws.utils/constants');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');

module.exports = {
  setLastError,
  setTransactionAsDefault,
  rollbackFailedTransactionFor,
  findDefaultDatasetAndTransaction,
  getStatusOfLatestTransactionByDatasetName
};

function setLastError(transactionId, lastErrorMessage, onErrorSet) {
  return transactionsRepository.setLastError(transactionId, lastErrorMessage, onErrorSet);
}

function setTransactionAsDefault(userId, datasetName, transactionCommit, onSetAsDefault) {
  return async.waterfall([
    async.constant({}),
    _findDatasetByNameAndUser,
    _findTransactionByDatasetAndCommit(transactionCommit),
    _setTransactionAsDefault
  ], (error, datasetWithTransactionCommit) => {
    return onSetAsDefault(error, datasetWithTransactionCommit);
  });

  function _findDatasetByNameAndUser(pipe, done) {
    return datasetsRepository.findByNameAndUser(datasetName, userId, (error, dataset) => {
      if (error || !dataset) {
        return done(error || `Given dataset was not found: '${datasetName}'`);
      }

      pipe.dataset = dataset;
      return done(null, pipe);
    });
  }

  function _setTransactionAsDefault(pipe, done) {
    return transactionsRepository.setAsDefault(userId, pipe.dataset._id, pipe.transaction._id, error => {
      if (error) {
        return done(error);
      }

      return done(null, {
        name: datasetName,
        commit: transactionCommit,
        createdAt: new Date(pipe.transaction.createdAt)
      });
    });
  }
}

function _findTransactionByDatasetAndCommit(transactionCommit) {
  return (pipe, done) => {
    return transactionsRepository.findByDatasetAndCommit(pipe.dataset._id, transactionCommit, (error, transaction) => {
      if (error || !_isTransactionValid(transaction)) {
        return done(error || `Given transaction was not found: '${transactionCommit}'`);
      }

      pipe.transaction = transaction;
      return done(null, pipe);
    });
  };
}

function rollbackFailedTransactionFor(datasetName, onRollbackCompleted) {
  const retryConfig = {times: 3, interval: 3000};

  return _findLatestFailedTransactionByDatasetName(datasetName, (error, failedTransaction) => {
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
      done => datasetsRepository.forceLock(datasetName, done),
      done => async.parallelLimit(rollbackTasks, constants.LIMIT_NUMBER_PROCESS, done),
      done => transactionsRepository.removeById(failedTransaction._id, done),
      done => datasetsRepository.removeVersion(datasetName, failedVersion, done),
      done => datasetsRepository.forceUnlock(datasetName, done),
      done => datasetsRepository.removeDatasetWithoutVersionsByName(datasetName, done)
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

function _findLatestFailedTransactionByDatasetName(datasetName, done) {
  return datasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found for the given name: ${datasetName}`);
    }

    return transactionsRepository.findLatestFailedByDataset(dataset._id, done);
  });
}

function getStatusOfLatestTransactionByDatasetName(datasetName, done) {
  return datasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found for the given name: ${datasetName}`);
    }

    return transactionsRepository.findLatestByDataset(dataset._id, (error, latestTransaction) => {
      if (error || !latestTransaction) {
        return done(error || `Transaction is absent for dataset: ${datasetName}`);
      }

      const version = latestTransaction.createdAt;
      const closedOrOpenedByVersionQuery = {dataset: dataset._id, $or: [{from: version}, {to: version}]};

      const modifiedObjectsTasks = {
        concepts: done => Concepts.count(closedOrOpenedByVersionQuery, done),
        entities: done => Entities.count(closedOrOpenedByVersionQuery, done),
        datapoints: done => DataPoints.count(closedOrOpenedByVersionQuery, done)
      };

      return async.parallelLimit(modifiedObjectsTasks, constants.LIMIT_NUMBER_PROCESS, (error, stats) => {
          if (error) {
            return done(error);
          }

          const result = {
            datasetName,
            transaction: {
              lastError: latestTransaction.lastError,
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

function findDefaultDatasetAndTransaction(datasetName, commit, onFound) {
  const croppedCommit = commit ? String(commit).slice(0, 7) : commit;

  if (datasetName && croppedCommit) {
    return _findDefaultDatasetAndTransactionByDatasetNameAndCommit(datasetName, croppedCommit, onFound);
  }

  if (datasetName) {
    return _findDefaultDatasetAndTransactionByDatasetName(datasetName, onFound);
  }

  if (croppedCommit) {
    return _findDefaultDatasetAndTransactionByCommit(croppedCommit, onFound);
  }

  return _findDefaultDatasetAndTransaction(onFound);
}

function _findDefaultDatasetAndTransactionByDatasetNameAndCommit(datasetName, commit, onFound) {
  return _getDefaultDatasetAndTransaction([
    _findDatasetByName(datasetName),
    _findTransactionByDatasetAndCommit(commit)
  ], onFound);
}

function _findDatasetByName(datasetName) {
  return (pipe, done) => datasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found: ${datasetName}`);
    }

    pipe.dataset = dataset;
    return done(null, pipe);
  });
}

function _findDefaultDatasetAndTransactionByDatasetName(datasetName, onFound) {
  return _getDefaultDatasetAndTransaction([
    _findDatasetByName(datasetName),
    _findDefaultByDatasetId,
    _findLatestCompletedByDatasetId
  ], onFound);

  function _findDefaultByDatasetId(pipe, done) {
    return transactionsRepository.findDefault({datasetId: pipe.dataset._id}, (error, transaction) => {
      if (error) {
        return done(error);
      }

      pipe.transaction = transaction;
      return done(null, pipe);
    });
  }

  function _findLatestCompletedByDatasetId(pipe, done) {
    if (pipe.transaction) {
      return async.setImmediate(() => done(null, pipe));
    }

    return transactionsRepository.findLatestCompletedByDataset(pipe.dataset._id, (error, transaction) => {
      if (error || !_isTransactionValid(transaction)) {
        return done(error || 'No versions were found for the given dataset');
      }

      pipe.transaction = transaction;
      return done(null, pipe);
    });
  }
}

function _findDefaultDatasetAndTransactionByCommit(commit, onFound) {
  return _getDefaultDatasetAndTransaction([
    _findDefaultDataset,
    _findTransactionByDatasetAndCommit(commit)
  ], onFound);

  function _findDefaultDataset(pipe, done) {
    return transactionsRepository.findDefault({populateDataset: true}, (error, transaction) => {
      if (error || !transaction) {
        return done(error || `Default dataset was not set`);
      }

      pipe.dataset = transaction.dataset;
      return done(null, pipe);
    });
  }
}

function _findDefaultDatasetAndTransaction(onFound) {
  return _getDefaultDatasetAndTransaction([_findDefaultTransactionWithPopulatedDataset], onFound);

  function _findDefaultTransactionWithPopulatedDataset(pipe, done) {
    return transactionsRepository.findDefault({populateDataset: true}, (error, transaction) => {
      if (error || !transaction) {
        return done(error || 'Default dataset was not set');
      }

      return done(null, {
        dataset: transaction.dataset,
        transaction: transaction
      });
    });
  }
}

function _getDefaultDatasetAndTransaction(tasks, onFound) {
  return async.waterfall([async.constant({})].concat(tasks), (error, pipe) => {
    if (error) {
      return onFound(error);
    }
    return onFound(null, {
      dataset: pipe.dataset,
      transaction: pipe.transaction
    });
  });
}

function _isTransactionValid(transaction) {
  return transaction && transaction.isClosed && !transaction.lastError;
}
