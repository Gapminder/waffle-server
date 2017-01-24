import * as async from 'async';
import {constants} from '../ws.utils/constants';
import * as datasetsService from './datasets.service';
import {DatasetsRepository} from '../ws.repository/ddf/datasets/datasets.repository';
import {DatasetTransactionsRepository} from '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import {ConceptsRepositoryFactory} from '../ws.repository/ddf/concepts/concepts.repository';
import {EntitiesRepositoryFactory} from '../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../ws.repository/ddf/data-points/data-points.repository';
import {DatasetSchemaRepository} from '../ws.repository/ddf/dataset-index/dataset-index.repository';

export {
  setLastError,
  setTransactionAsDefault,
  rollbackFailedTransactionFor,
  findDefaultDatasetAndTransaction,
  getStatusOfLatestTransactionByDatasetName
};

interface RequestedParamsModel {
  transactionCommit?: string;
  datasetName?: string;
}

interface ExternalContextModel extends RequestedParamsModel {
  transaction: any;
  dataset: any;
}

function setLastError(transactionId, lastErrorMessage, onErrorSet) {
  return DatasetTransactionsRepository.setLastError(transactionId, lastErrorMessage, onErrorSet);
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
  return DatasetsRepository.findByNameAndUser(externalContext.datasetName, externalContext.userId, (error, dataset) => {
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
  return DatasetTransactionsRepository.findByDatasetAndCommit(extrenalContext.dataset._id, extrenalContext.transactionCommit, (error, transaction) => {
    if (error || !_isTransactionValid(transaction)) {
      return done(error || `Given transaction was not found: '${extrenalContext.transactionCommit}'`);
    }

    extrenalContext.transaction = transaction;
    return done(null, extrenalContext);
  });
}

function _setTransactionAsDefault(externalContext, done) {
  return DatasetTransactionsRepository.setAsDefault(externalContext.userId, externalContext.dataset._id, externalContext.transaction._id, error => {
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

function rollbackFailedTransactionFor(datasetName, user, onRollbackCompleted) {
  return async.waterfall([
    async.constant({datasetName, user}),
    datasetsService.findDatasetByNameAndValidateOwnership,
    _findLatestFailedTransactionByDataset,
    _forceDatasetLock,
    _rollbackDatasetData,
    _removeFailedTransaction,
    _forceDatasetUnlock,
    _removeDatasetWithoutTransactions
  ], onRollbackCompleted);
}

function _findLatestFailedTransactionByDataset(externalContext, onFailedTransactionFound) {
  return DatasetTransactionsRepository.findLatestFailedByDataset(externalContext.datasetId, (error, failedTransaction) => {
    if (error) {
      return onFailedTransactionFound(error);
    }

    if (!failedTransaction) {
      return onFailedTransactionFound('There is nothing to rollback - all transactions are completed successfully');
    }

    externalContext.failedTransaction = failedTransaction;

    return onFailedTransactionFound(null, externalContext);
  });
}

function _forceDatasetLock(externalContext, onDatasetLocked) {
  return DatasetsRepository.forceLock(externalContext.datasetName, (forceLockError) => {
    if (forceLockError) {
      return onDatasetLocked(forceLockError);
    }

    return onDatasetLocked(null, externalContext);
  });
}

function _rollbackDatasetData(externalContext, onRollbackDataFinished) {
  const conceptsRepository = ConceptsRepositoryFactory.versionAgnostic();
  const entitiesRepository = EntitiesRepositoryFactory.versionAgnostic();
  const datapointsRepository = DatapointsRepositoryFactory.versionAgnostic();

  return async.parallel([
    async.apply(conceptsRepository.rollback, externalContext.failedTransaction),
    async.apply(entitiesRepository.rollback, externalContext.failedTransaction),
    async.apply(datapointsRepository.rollback, externalContext.failedTransaction),
    async.apply(DatasetSchemaRepository.rollback, externalContext.failedTransaction)
  ], (rollbackDataError) => {
    if (rollbackDataError) {
      return onRollbackDataFinished(rollbackDataError);
    }

    return onRollbackDataFinished(null, externalContext);
  });
}

function _removeFailedTransaction(externalContext, onTransactionRemoved) {
  return DatasetTransactionsRepository.removeById(externalContext.failedTransaction._id, (removeTransactionError) => {
    if (removeTransactionError) {
      return onTransactionRemoved(removeTransactionError);
    }

    return onTransactionRemoved(null, externalContext);
  });
}

function _forceDatasetUnlock(externalContext, onDatasetUnlocked) {
  return DatasetsRepository.forceUnlock(externalContext.datasetName, (forceUnlockError) => {
    if (forceUnlockError) {
      return onDatasetUnlocked(forceUnlockError);
    }

    return onDatasetUnlocked(null, externalContext);
  });
}

function _removeDatasetWithoutTransactions(externalContext, onDatasetRemoved) {
  return DatasetTransactionsRepository.countByDataset(externalContext.datasetId, (countTransactionError, amount) => {
    if (countTransactionError) {
      return onDatasetRemoved(countTransactionError);
    }

    if (amount > 0) {
      return onDatasetRemoved();
    }

    return DatasetsRepository.removeById(externalContext.datasetId, onDatasetRemoved);
  });
}

function getStatusOfLatestTransactionByDatasetName(datasetName, user, done) {
  return datasetsService.findDatasetByNameAndValidateOwnership({datasetName, user}, (error, externalContext)=> {
    if (error) {
      return done(error);
    }

    return _findObjectsModifiedDuringLastTransaction(externalContext, done);
  });
}

function _findObjectsModifiedDuringLastTransaction(externalContext, done) {
  return DatasetTransactionsRepository.findLatestByDataset(externalContext.datasetId, (error, latestTransaction) => {
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
  const conceptsRepository = ConceptsRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);
  const entitiesRepository = EntitiesRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);
  const datapointsRepository = DatapointsRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);

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
  return DatasetsRepository.findByName(externalContext.datasetName, (error, dataset) => {
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
    return DatasetTransactionsRepository.findDefault({datasetId: externalContext.dataset._id}, (error, transaction) => {
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

    return DatasetTransactionsRepository.findLatestCompletedByDataset(externalContext.dataset._id, (error, transaction) => {
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
    return DatasetTransactionsRepository.findDefault({populateDataset: true}, (error, transaction) => {
      if (error || !transaction) {
        return done(error || `Default dataset was not set`);
      }

      pipe.dataset = transaction.dataset;
      return done(null, pipe);
    });
  }
}

function _findDefaultPopulatedDatasetAndTransaction(onFound) {
  return DatasetTransactionsRepository.findDefault({populateDataset: true}, (error, transaction) => {
    if (error || !transaction) {
      return onFound(error || 'Default dataset was not set');
    }

    return onFound(null, {
      dataset: transaction.dataset,
      transaction: transaction
    });
  });
}

function _getDefaultDatasetAndTransaction(options: RequestedParamsModel, tasks, onFound) {
  return async.waterfall([async.constant(options)].concat(tasks), (error, pipe: ExternalContextModel) => {
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
