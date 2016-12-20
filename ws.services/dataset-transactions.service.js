'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const constants = require('../ws.utils/constants');
const datasetService = require('./datasets.service');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');

module.exports = {
  setLastError,
  setTransactionAsDefault,
  rollbackLatestTransactionFor,
  findDefaultDatasetAndTransaction,
  getStatusOfLatestTransactionByDatasetName
};

function setLastError(transactionId, lastErrorMessage, onErrorSet) {
  return transactionsRepository.setLastError(transactionId, lastErrorMessage, onErrorSet);
}

function setTransactionAsDefault(userId, datasetName, transactionCommit, onSetAsDefault) {
  return async.waterfall([
    async.constant({userId, datasetName, transactionCommit}),
    _findDatasetByNameAndUser,
    _findTransactionByDatasetAndCommit,
    _setTransactionAsDefault
  ], onSetAsDefault);
}

function _findDatasetByNameAndUser(externalContext, done) {
  return datasetsRepository.findByNameAndUser(externalContext.datasetName, externalContext.userId, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Given dataset was not found: '${externalContext.datasetName}'`);
    }

    if (dataset.private) {
      return done(`Private dataset cannot be default`);
    }

    externalContext.dataset = dataset;
    return done(null, externalContext);
  });
}

function _findTransactionByDatasetAndCommit(extrenalContext, done) {
  return transactionsRepository.findByDatasetAndCommit(extrenalContext.dataset._id, extrenalContext.transactionCommit, (error, transaction) => {
    if (error || !_isTransactionValid(transaction)) {
      return done(error || `Given transaction was not found: '${extrenalContext.transactionCommit}'`);
    }

    extrenalContext.transaction = transaction;
    return done(null, extrenalContext);
  });
}

function _setTransactionAsDefault(externalContext, done) {
  return transactionsRepository.setAsDefault(externalContext.userId, externalContext.dataset._id, externalContext.transaction._id, error => {
    if (error) {
      return done(error);
    }

    return done(null, {
      name: externalContext.datasetName,
      commit: externalContext.transactionCommit,
      createdAt: new Date(externalContext.transaction.createdAt)
    });
  });
}

function rollbackLatestTransactionFor(datasetName, user, onRollbackCompleted) {
  return async.waterfall([
    async.constant({datasetName, user}),
    datasetService.findDatasetByNameAndValidateOwnership,
    _findLatestTransactionByDataset,
    _forceDatasetLock,
    _rollbackDatasetData,
    _removeLatestTransaction,
    _forceDatasetUnlock,
    _removeDatasetWithoutTransactions
  ], onRollbackCompleted);
}

function _findLatestTransactionByDataset(externalContext, onLatestTransactionFound) {
  return transactionsRepository.findLatestByDataset(externalContext.datasetId, (error, latestTransaction) => {
    if (error) {
      return onLatestTransactionFound(error);
    }

    if (!latestTransaction) {
      return onLatestTransactionFound('There is nothing to rollback');
    }

    externalContext.latestTransaction = latestTransaction;

    return onLatestTransactionFound(null, externalContext);
  });
}

function _forceDatasetLock(externalContext, onDatasetLocked) {
  return datasetsRepository.forceLock(externalContext.datasetName, (forceLockError) => {
    if (forceLockError) {
      return onDatasetLocked(forceLockError);
    }

    return onDatasetLocked(null, externalContext);
  });
}

function _rollbackDatasetData(externalContext, onRollbackDataFinished) {
  const retryConfig = {times: 3, interval: 3000};

  const conceptsRepository = conceptsRepositoryFactory.versionAgnostic();
  const entitiesRepository = entitiesRepositoryFactory.versionAgnostic();
  const datapointsRepository = datapointsRepositoryFactory.versionAgnostic();

  return async.parallel([
    async.retry(retryConfig, async.apply(conceptsRepository.rollback, externalContext.latestTransaction)),
    async.retry(retryConfig, async.apply(entitiesRepository.rollback, externalContext.latestTransaction)),
    async.retry(retryConfig, async.apply(datapointsRepository.rollback, externalContext.latestTransaction)),
    async.retry(retryConfig, async.apply(datasetIndexRepository.rollback, externalContext.latestTransaction))
  ], (rollbackDataError) => {
    if (rollbackDataError) {
      return onRollbackDataFinished(rollbackDataError);
    }

    return onRollbackDataFinished(null, externalContext);
  });
}

function _removeLatestTransaction(externalContext, onTransactionRemoved) {
  return transactionsRepository.removeById(externalContext.latestTransaction._id, (removeTransactionError) => {
    if (removeTransactionError) {
      return onTransactionRemoved(removeTransactionError);
    }

    return onTransactionRemoved(null, externalContext);
  });
}

function _forceDatasetUnlock(externalContext, onDatasetUnlocked) {
  return datasetsRepository.forceUnlock(externalContext.datasetName, (forceUnlockError) => {
    if (forceUnlockError) {
      return onDatasetUnlocked(forceUnlockError);
    }

    return onDatasetUnlocked(null, externalContext);
  });
}

function _removeDatasetWithoutTransactions(externalContext, onDatasetRemoved) {
  return transactionsRepository.countByDataset(externalContext.datasetId, (countTransactionError, amount) => {
    if (countTransactionError) {
      return onDatasetRemoved(countTransactionError);
    }

    if (amount > 0) {
      return onDatasetRemoved();
    }

    return datasetsRepository.removeById(externalContext.datasetId, onDatasetRemoved);
  });
}

function getStatusOfLatestTransactionByDatasetName(datasetName, user, done) {
  return datasetService.findDatasetByNameAndValidateOwnership({datasetName, user}, (error, externalContext)=> {
    if (error) {
      return done(error);
    }

    return _findObjectsModifiedDuringLastTransaction(externalContext, done);
  });
}

function _findObjectsModifiedDuringLastTransaction(externalContext, done) {
  return transactionsRepository.findLatestByDataset(externalContext.datasetId, (error, latestTransaction) => {
    if (error) {
      return done(error);
    }

    if (!latestTransaction) {
      return done(`Transaction is absent for dataset: ${externalContext.datasetName}`);
    }

    const modifiedObjectsTasks =
      _createTasksForCountingObjectsModifiedInGivenVersion(externalContext.datasetId, latestTransaction.createdAt);

    return async.parallelLimit(modifiedObjectsTasks, constants.LIMIT_NUMBER_PROCESS, (error, stats) => {
      if (error) {
        return done(error);
      }

      const result = {
        datasetName: externalContext.datasetName,
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
}

function _createTasksForCountingObjectsModifiedInGivenVersion(datasetId, version) {
  const conceptsRepository = conceptsRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);
  const entitiesRepository = entitiesRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);
  const datapointsRepository = datapointsRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);

  return {
    concepts: done => conceptsRepository.count(done),
    entities: done => entitiesRepository.count(done),
    datapoints: done => datapointsRepository.count(done),
  };
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

  return _findDefaultPopulatedDatasetAndTransaction(onFound);
}

function _findDefaultDatasetAndTransactionByDatasetNameAndCommit(datasetName, transactionCommit, onFound) {
  return _getDefaultDatasetAndTransaction({transactionCommit, datasetName}, [
    _findDatasetByName,
    _findTransactionByDatasetAndCommit
  ], onFound);
}

function _findDatasetByName(externalContext, done) {
  return datasetsRepository.findByName(externalContext.datasetName, (error, dataset) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found: ${externalContext.datasetName}`);
    }

    externalContext.dataset = dataset;
    return done(null, externalContext);
  });
}

function _findDefaultDatasetAndTransactionByDatasetName(datasetName, onFound) {
  return _getDefaultDatasetAndTransaction({datasetName}, [
    _findDatasetByName,
    _findDefaultByDatasetId,
    _findLatestCompletedByDatasetId
  ], onFound);

  function _findDefaultByDatasetId(externalContext, done) {
    return transactionsRepository.findDefault({datasetId: externalContext.dataset._id}, (error, transaction) => {
      if (error) {
        return done(error);
      }

      externalContext.transaction = transaction;
      return done(null, externalContext);
    });
  }

  function _findLatestCompletedByDatasetId(externalContext, done) {
    if (externalContext.transaction) {
      return async.setImmediate(() => done(null, externalContext));
    }

    return transactionsRepository.findLatestCompletedByDataset(externalContext.dataset._id, (error, transaction) => {
      if (error || !_isTransactionValid(transaction)) {
        return done(error || 'No versions were found for the given dataset');
      }

      externalContext.transaction = transaction;
      return done(null, externalContext);
    });
  }
}

function _findDefaultDatasetAndTransactionByCommit(transactionCommit, onFound) {
  return _getDefaultDatasetAndTransaction({transactionCommit}, [
    _findDefaultDataset,
    _findTransactionByDatasetAndCommit
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

function _findDefaultPopulatedDatasetAndTransaction(onFound) {
  return transactionsRepository.findDefault({populateDataset: true}, (error, transaction) => {
    if (error || !transaction) {
      return onFound(error || 'Default dataset was not set');
    }

    return onFound(null, {
      dataset: transaction.dataset,
      transaction: transaction
    });
  });
}

function _getDefaultDatasetAndTransaction(options, tasks, onFound) {
  return async.waterfall([async.constant(options)].concat(tasks), (error, pipe) => {
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
