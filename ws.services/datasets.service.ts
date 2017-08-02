import * as _ from 'lodash';
import * as async from 'async';
import * as securityUtils from '../ws.utils/security';
import { DatasetsRepository } from '../ws.repository/ddf/datasets/datasets.repository';
import { ConceptsRepositoryFactory } from '../ws.repository/ddf/concepts/concepts.repository';
import { EntitiesRepositoryFactory } from '../ws.repository/ddf/entities/entities.repository';
import { DatapointsRepositoryFactory } from '../ws.repository/ddf/data-points/data-points.repository';
import { DatasetSchemaRepository } from '../ws.repository/ddf/dataset-index/dataset-index.repository';
import { DatasetTransactionsRepository } from '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { constants } from '../ws.utils/constants';
import { logger } from '../ws.config/log';
import { DatasetRemovalTracker } from './datasets-removal-tracker';
import { MongooseCallback } from '../ws.repository/repository.types';

const DATAPOINTS_TO_REMOVE_CHUNK_SIZE = 50000;

export {
  findDatasetsWithVersions,
  removeDatasetData,
  findDatasetByNameAndValidateOwnership,
  getRemovalStateForDataset,
  lockDataset,
  unlockDataset
};

function findDatasetsWithVersions(userId: any, onFound: AsyncResultCallback<any, any>): void {
  return async.waterfall([
    async.constant({ userId }),
    _findDatasetsByUser,
    _collectVersionsForEachDataset
  ], (error: string, datasetsWithVersions: any) => {
    return onFound(error, datasetsWithVersions);
  });
}

function removeDatasetData(datasetName: string, user: any, onRemovedDataset: AsyncResultCallback<any, any>): void {
  DatasetRemovalTracker.track(datasetName);
  return async.waterfall([
    async.constant({ datasetName, user }),
    findDatasetByNameAndValidateOwnership,
    lockDataset,
    _checkDefaultTransactionInDataset,
    _removeAllDataByDataset,
    _removeAllTransactions,
    _removeDataset
  ], (removalError: any) => {
    DatasetRemovalTracker.clean(datasetName);

    if (removalError) {
      return unlockDataset({ datasetName }, () => onRemovedDataset(removalError, null));
    }

    return onRemovedDataset(removalError, null);
  });
}

function findDatasetByNameAndValidateOwnership(externalContext: any, onDatasetValidated: Function): any {
  return DatasetsRepository.findByName(externalContext.datasetName, (datasetSearchError: any, dataset: any) => {
    if (datasetSearchError || !dataset) {
      return onDatasetValidated(datasetSearchError || `Dataset was not found for the given name: ${externalContext.datasetName}`);
    }

    return securityUtils.validateDatasetOwner({
      dataset,
      user: externalContext.user
    }, (datasetValidationError: any) => {
      if (datasetValidationError) {
        return onDatasetValidated(datasetValidationError);
      }

      externalContext.datasetId = dataset._id;
      externalContext.dataset = dataset;
      return onDatasetValidated(null, externalContext);
    });
  });
}

function lockDataset(externalContext: any, onDatasetLocked: Function): any {
  const datasetName = _.get(externalContext, 'dataset.name', externalContext.datasetName);
  return DatasetsRepository.lock(datasetName, (datasetLockError: any, dataset: any) => {
    if (datasetLockError) {
      return onDatasetLocked(datasetLockError);
    }

    if (!dataset) {
      return onDatasetLocked(`Version of dataset "${datasetName}" was already locked or dataset is absent`);
    }

    return onDatasetLocked(null, externalContext);
  });
}

function unlockDataset(externalContext: any, done: Function): any {
  return DatasetsRepository.unlock(externalContext.datasetName, (err: any, dataset: any) => {
    if (!dataset) {
      return done(`Version of dataset "${externalContext.datasetName}" wasn't locked`);
    }

    return done(err, externalContext);
  });
}

function _checkDefaultTransactionInDataset(externalContext: any, onTransactionsFound: Function): void {
  return DatasetTransactionsRepository.findDefault({ datasetId: externalContext.datasetId }, (transactionsSearchError: any, defaultTransaction: any) => {
    if (transactionsSearchError) {
      return onTransactionsFound(transactionsSearchError);
    }

    if (defaultTransaction) {
      return DatasetsRepository.unlock(externalContext.datasetName, (datasetUnlockError: any) => {
        if (datasetUnlockError) {
          return onTransactionsFound(datasetUnlockError);
        }

        return onTransactionsFound('Default dataset couldn\'t be removed');
      });
    }

    return onTransactionsFound(null, externalContext);
  });
}

function _removeAllDataByDataset(externalContext: any, onDataRemoved: AsyncResultCallback<any, any>): void {
  const conceptsRepository = ConceptsRepositoryFactory.versionAgnostic();
  const entitiesRepository = EntitiesRepositoryFactory.versionAgnostic();

  return async.parallel([
    (done: Function) => conceptsRepository.removeByDataset(externalContext.datasetId, (error: string, removeResult: any) => {
      if (error) {
        return done(error);
      }

      DatasetRemovalTracker
        .get(externalContext.datasetName)
        .increment(constants.CONCEPTS, removeResult.result.n);

      return done();
    }),
    (done: Function) => entitiesRepository.removeByDataset(externalContext.datasetId, (error: string, removeResult: any) => {
      if (error) {
        return done(error);
      }

      DatasetRemovalTracker
        .get(externalContext.datasetName)
        .increment(constants.ENTITIES, removeResult.result.n);

      return done();
    }),
    (done: Function) => removeDatapointsInChunks(externalContext, done),
    (done: Function) => DatasetSchemaRepository.removeByDataset(externalContext.datasetId, done)
  ], (removingDataError: any) => {
    if (removingDataError) {
      return onDataRemoved(removingDataError, null);
    }
    return onDataRemoved(null, externalContext);
  });
}

function removeDatapointsInChunks({ datasetId, datasetName }: any, onRemoved: Function): void {
  const datapointsRepository = DatapointsRepositoryFactory.versionAgnostic();
  datapointsRepository.findIdsByDatasetAndLimit(datasetId, DATAPOINTS_TO_REMOVE_CHUNK_SIZE, (error: string, datapointIds: any[]) => {
    const amountOfDatapointsToRemove = _.size(datapointIds);
    logger.info('Removing datapoints', amountOfDatapointsToRemove);

    if (error) {
      logger.error('Datapoints removing error', error);
      return onRemoved(error);
    }

    if (_.isEmpty(datapointIds)) {
      return onRemoved(null);
    }

    datapointsRepository.removeByIds(datapointIds, (removalError: any) => {
      if (removalError) {
        return onRemoved(removalError);
      }

      DatasetRemovalTracker
        .get(datasetName)
        .increment(constants.DATAPOINTS, amountOfDatapointsToRemove);

      removeDatapointsInChunks({ datasetId, datasetName }, onRemoved);
    });
  });
}

function getRemovalStateForDataset(datasetName: any, user: any, done: Function): any {
  return findDatasetByNameAndValidateOwnership({ datasetName, user }, (error: string, externalContext: any) => {
    if (error) {
      return done(error);
    }

    return done(null, DatasetRemovalTracker.get(datasetName).getState());
  });
}

function _removeAllTransactions(pipe: any, onTransactionsRemoved: Function): any {
  return DatasetTransactionsRepository.removeAllByDataset(pipe.datasetId, (error: string) => onTransactionsRemoved(error, pipe));
}

function _removeDataset(pipe: any, onDatasetRemoved: MongooseCallback): void {
  return DatasetsRepository.removeById(pipe.datasetId, onDatasetRemoved);
}

function _findDatasetsByUser(pipe: any, done: Function): any {
  return DatasetsRepository.findByUser(pipe.userId, (datasetSearchError: any, datasets: any[]) => {
    if (datasetSearchError) {
      return done(datasetSearchError);
    }

    pipe.datasets = datasets;
    return done(null, pipe);
  });
}

function _collectVersionsForEachDataset(pipe: any, done: Function): void {
  return async.mapLimit(pipe.datasets, constants.LIMIT_NUMBER_PROCESS, _findAllCompletedVersionsByDataset, (collectingVersionsError: any, datasetsWithVersions: any) => {
    if (collectingVersionsError) {
      return done(collectingVersionsError);
    }

    return done(null, datasetsWithVersions);
  });
}

function _findAllCompletedVersionsByDataset(dataset: any, onTransactionsFound: Function): void {
  return DatasetTransactionsRepository.findAllCompletedByDataset(dataset._id, (transactionSearchError: any, transactions: any[]) => {
    if (transactionSearchError) {
      return onTransactionsFound(transactionSearchError);
    }

    const versions = _.map(transactions, (transaction: any) => {
      return {
        commit: transaction.commit,
        isDefault: transaction.isDefault,
        createdAt: new Date(transaction.createdAt)
      };
    });

    const datasetWithVersions = {
      id: dataset._id,
      name: dataset.name,
      path: dataset.path,
      isDefault: _.some(versions, (version: any) => version.isDefault),
      versions
    };

    return onTransactionsFound(null, datasetWithVersions);
  });
}
