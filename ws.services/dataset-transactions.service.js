'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const constants = require('../ws.utils/constants');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');
const VersionedModelRepositoryFactory = require('../ws.repository/repository.factory');

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

    const rollbackTasks =
      _.chain([conceptsRepositoryFactory, entitiesRepositoryFactory, datapointsRepositoryFactory, datasetIndexRepository])
        .map(repositoryFactory => toRollbackFunction(repositoryFactory, failedTransaction))
        .flatten()
        .map(rollbackTask => (done => async.retry(retryConfig, rollbackTask, done)))
        .value();

    async.series([
      done => datasetsRepository.forceLock(datasetName, done),
      done => async.parallelLimit(rollbackTasks, constants.LIMIT_NUMBER_PROCESS, done),
      done => transactionsRepository.removeById(failedTransaction._id, done),
      done => datasetsRepository.forceUnlock(datasetName, done),
      done => _removeDatasetWithoutTransactions(failedTransaction.dataset, done)
    ],
    onRollbackCompleted);
  });
}

function toRollbackFunction(repositoryFactory, versionToRollback) {
  const repository = repositoryFactory instanceof VersionedModelRepositoryFactory ? repositoryFactory.versionAgnostic() : repositoryFactory;
  return repository.rollback.bind(repository, versionToRollback);
}

function _removeDatasetWithoutTransactions(datasetId, done) {
  return transactionsRepository.countByDataset(datasetId, (error, amount) => {
    if (amount > 0) {
      return done();
    }
    return datasetsRepository.removeById(datasetId, done);
  });
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

      const conceptsRepository = conceptsRepositoryFactory.closedOrOpenedInGivenVersion(dataset._id, version);
      const entitiesRepository = entitiesRepositoryFactory.closedOrOpenedInGivenVersion(dataset._id, version);
      const datapointsRepository = datapointsRepositoryFactory.closedOrOpenedInGivenVersion(dataset._id, version);

      const modifiedObjectsTasks = {
        concepts: done => conceptsRepository.count(done),
        entities: done => entitiesRepository.count(done),
        datapoints: done => datapointsRepository.count(done),
      };

      return async.parallelLimit(modifiedObjectsTasks, constants.LIMIT_NUMBER_PROCESS, (error, stats) => {
          if (error) {
            return done(error);
          }

          const result = {
            datasetName,
            transaction: {
              languages: latestTransaction.languages,
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
