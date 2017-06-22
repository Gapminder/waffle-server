import * as async from 'async';
import { constants } from '../ws.utils/constants';
import * as datasetsService from './datasets.service';
import { DatasetsRepository } from '../ws.repository/ddf/datasets/datasets.repository';
import { DatasetTransactionsRepository } from '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { ConceptsRepositoryFactory } from '../ws.repository/ddf/concepts/concepts.repository';
import { EntitiesRepositoryFactory } from '../ws.repository/ddf/entities/entities.repository';
import { DatapointsRepositoryFactory } from '../ws.repository/ddf/data-points/data-points.repository';
import { DatasetSchemaRepository } from '../ws.repository/ddf/dataset-index/dataset-index.repository';

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

function setLastError(transactionId: any, lastErrorMessage: string, onErrorSet: Function): void {
  return DatasetTransactionsRepository.setLastError(transactionId, lastErrorMessage, onErrorSet);
}

function setTransactionAsDefault(userId: any, datasetName: string, transactionCommit: any, onSetAsDefault: AsyncResultCallback<any, any>): void {
  return async.waterfall([
    async.constant({ userId, datasetName, transactionCommit }),
    _findDatasetByNameAndUser,
    _findTransactionByDatasetAndCommit,
    _setTransactionAsDefault
  ], onSetAsDefault);
}

function _findDatasetByNameAndUser(externalContext: any, done: Function): any {
  return DatasetsRepository.findByNameAndUser(externalContext.datasetName, externalContext.userId, (error: string, dataset: any) => {
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

function _findTransactionByDatasetAndCommit(extrenalContext: any, done: Function): void {
  return DatasetTransactionsRepository.findByDatasetAndCommit(extrenalContext.dataset._id, extrenalContext.transactionCommit, (error: string, transaction: any) => {
    if (error || !_isTransactionValid(transaction)) {
      return done(error || `Given transaction was not found: '${extrenalContext.transactionCommit}'`);
    }

    extrenalContext.transaction = transaction;
    return done(null, extrenalContext);
  });
}

function _setTransactionAsDefault(externalContext: any, done: Function): void {
  return DatasetTransactionsRepository.setAsDefault(externalContext.userId, externalContext.dataset._id, externalContext.transaction._id, (error: string) => {
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

function rollbackFailedTransactionFor(datasetName: string, user: any, onRollbackCompleted: AsyncResultCallback<any, any>): void {
  return async.waterfall([
    async.constant({ datasetName, user }),
    datasetsService.findDatasetByNameAndValidateOwnership,
    _findLatestFailedTransactionByDataset,
    _forceDatasetLock,
    _rollbackDatasetData,
    _removeFailedTransaction,
    _forceDatasetUnlock,
    _removeDatasetWithoutTransactions
  ], onRollbackCompleted);
}

function _findLatestFailedTransactionByDataset(externalContext: any, onFailedTransactionFound: Function): void {
  return DatasetTransactionsRepository.findLatestFailedByDataset(externalContext.datasetId, (error: string, failedTransaction: any) => {
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

function _forceDatasetLock(externalContext: any, onDatasetLocked: Function): any {
  return DatasetsRepository.forceLock(externalContext.datasetName, (forceLockError: any) => {
    if (forceLockError) {
      return onDatasetLocked(forceLockError);
    }

    return onDatasetLocked(null, externalContext);
  });
}

function _rollbackDatasetData(externalContext: any, onRollbackDataFinished: Function): void {
  const conceptsRepository = ConceptsRepositoryFactory.versionAgnostic();
  const entitiesRepository = EntitiesRepositoryFactory.versionAgnostic();
  const datapointsRepository = DatapointsRepositoryFactory.versionAgnostic();

  return async.parallel([
    async.apply(conceptsRepository.rollback, externalContext.failedTransaction),
    async.apply(entitiesRepository.rollback, externalContext.failedTransaction),
    async.apply(datapointsRepository.rollback, externalContext.failedTransaction),
    async.apply(DatasetSchemaRepository.rollback, externalContext.failedTransaction)
  ], (rollbackDataError: any) => {
    if (rollbackDataError) {
      return onRollbackDataFinished(rollbackDataError);
    }

    return onRollbackDataFinished(null, externalContext);
  });
}

function _removeFailedTransaction(externalContext: any, onTransactionRemoved: Function): void {
  return DatasetTransactionsRepository.removeById(externalContext.failedTransaction._id, (removeTransactionError: any) => {
    if (removeTransactionError) {
      return onTransactionRemoved(removeTransactionError);
    }

    return onTransactionRemoved(null, externalContext);
  });
}

function _forceDatasetUnlock(externalContext: any, onDatasetUnlocked: Function): any {
  return DatasetsRepository.forceUnlock(externalContext.datasetName, (forceUnlockError: any) => {
    if (forceUnlockError) {
      return onDatasetUnlocked(forceUnlockError);
    }

    return onDatasetUnlocked(null, externalContext);
  });
}

function _removeDatasetWithoutTransactions(externalContext: any, onDatasetRemoved: Function): void {
  return DatasetTransactionsRepository.countByDataset(externalContext.datasetId, (countTransactionError: any, amount: number) => {
    if (countTransactionError) {
      return onDatasetRemoved(countTransactionError);
    }

    if (amount > 0) {
      return onDatasetRemoved();
    }

    return DatasetsRepository.removeById(externalContext.datasetId, onDatasetRemoved);
  });
}

function getStatusOfLatestTransactionByDatasetName(datasetName: string, user: any, done: Function): void {
  return datasetsService.findDatasetByNameAndValidateOwnership({
    datasetName,
    user
  }, (error: string, externalContext: any) => {
    if (error) {
      return done(error);
    }

    return _findObjectsModifiedDuringLastTransaction(externalContext, done);
  });
}

function _findObjectsModifiedDuringLastTransaction(externalContext: any, done: Function): void {
  return DatasetTransactionsRepository.findLatestByDataset(externalContext.datasetId, (error: string, latestTransaction: any) => {
    if (error) {
      return done(error);
    }

    if (!latestTransaction) {
      return done(`Transaction is absent for dataset: ${externalContext.datasetName}`);
    }

    const modifiedObjectsTasks =
      _createTasksForCountingObjectsModifiedInGivenVersion(externalContext.datasetId, latestTransaction.createdAt);

    return async.parallelLimit(modifiedObjectsTasks, constants.LIMIT_NUMBER_PROCESS, (countingError: any, stats: any) => {
      if (countingError) {
        return done(countingError);
      }

      const result = {
        datasetName: externalContext.datasetName,
        transaction: {
          lastError: latestTransaction.lastError,
          commit: latestTransaction.commit,
          status: latestTransaction.isClosed ? 'Completed' : 'In progress',
          createdAt: new Date(latestTransaction.createdAt)
        },
        modifiedObjects: stats
      };

      return done(countingError, result);
    });
  });
}

function _createTasksForCountingObjectsModifiedInGivenVersion(datasetId: any, version: any): any {
  const conceptsRepository = ConceptsRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);
  const entitiesRepository = EntitiesRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);
  const datapointsRepository = DatapointsRepositoryFactory.closedOrOpenedInGivenVersion(datasetId, version);

  return {
    concepts: (done: (err: any, count: number) => void) => conceptsRepository.count(done),
    entities: (done: Function) => entitiesRepository.count(done),
    datapoints: (done: Function) => datapointsRepository.count(done)
  };
}

function findDefaultDatasetAndTransaction(datasetName: string, commit: string, onFound: Function): void {
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

function _findDefaultDatasetAndTransactionByDatasetNameAndCommit(datasetName: string, transactionCommit: any, onFound: Function): void {
  return _getDefaultDatasetAndTransaction({ transactionCommit, datasetName }, [
    _findDatasetByName,
    _findTransactionByDatasetAndCommit
  ], onFound);
}

function _findDatasetByName(externalContext: any, done: Function): any {
  return DatasetsRepository.findByName(externalContext.datasetName, (error: string, dataset: any) => {
    if (error || !dataset) {
      return done(error || `Dataset was not found: ${externalContext.datasetName}`);
    }

    externalContext.dataset = dataset;
    return done(null, externalContext);
  });
}

function _findDefaultDatasetAndTransactionByDatasetName(datasetName: string, onFound: Function): void {
  return _getDefaultDatasetAndTransaction({ datasetName }, [
    _findDatasetByName,
    _findDefaultByDatasetId,
    _findLatestCompletedByDatasetId
  ], onFound);

  function _findDefaultByDatasetId(externalContext: any, done: Function): void {
    return DatasetTransactionsRepository.findDefault({ datasetId: externalContext.dataset._id }, (error: string, transaction: any) => {
      if (error) {
        return done(error);
      }

      externalContext.transaction = transaction;
      return done(null, externalContext);
    });
  }

  function _findLatestCompletedByDatasetId(externalContext: any, done: Function): void {
    if (externalContext.transaction) {
      return async.setImmediate(() => done(null, externalContext));
    }

    return DatasetTransactionsRepository.findLatestCompletedByDataset(externalContext.dataset._id, (error: string, transaction: any) => {
      if (error || !_isTransactionValid(transaction)) {
        return done(error || 'No versions were found for the given dataset');
      }

      externalContext.transaction = transaction;
      return done(null, externalContext);
    });
  }
}

function _findDefaultDatasetAndTransactionByCommit(transactionCommit: any, onFound: Function): void {
  return _getDefaultDatasetAndTransaction({ transactionCommit }, [
    _findDefaultDataset,
    _findTransactionByDatasetAndCommit
  ], onFound);

  function _findDefaultDataset(pipe: any, done: Function): void {
    return DatasetTransactionsRepository.findDefault({ populateDataset: true }, (error: string, transaction: any) => {
      if (error || !transaction) {
        return done(error || `Default dataset was not set`);
      }

      pipe.dataset = transaction.dataset;
      return done(null, pipe);
    });
  }
}

function _findDefaultPopulatedDatasetAndTransaction(onFound: Function): void {
  return DatasetTransactionsRepository.findDefault({ populateDataset: true }, (error: string, transaction: any) => {
    if (error || !transaction) {
      return onFound(error || 'Default dataset was not set');
    }

    return onFound(null, {
      dataset: transaction.dataset,
      transaction
    });
  });
}

function _getDefaultDatasetAndTransaction(options: RequestedParamsModel, tasks: any[], onFound: Function): void {
  return async.waterfall([async.constant(options)].concat(tasks), (error: string, pipe: ExternalContextModel) => {
    if (error) {
      return onFound(error);
    }

    return onFound(null, {
      dataset: pipe.dataset,
      transaction: pipe.transaction
    });
  });
}

function _isTransactionValid(transaction: any): boolean {
  return transaction && transaction.isClosed && !transaction.lastError;
}
