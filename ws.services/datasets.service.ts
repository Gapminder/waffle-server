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

const DATAPOINTS_TO_REMOVE_CHUNK_SIZE = 50000;

export {
  findDatasetsWithVersions,
  removeDatasetData,
  findDatasetByNameAndValidateOwnership,
  getRemovalStateForDataset,
  lockDataset,
  unlockDataset
};

function findDatasetsWithVersions(userId, onFound) {
  return async.waterfall([
    async.constant({userId}),
    _findDatasetsByUser,
    _collectVersionsForEachDataset
  ], (error, datasetsWithVersions) => {
    return onFound(error, datasetsWithVersions);
  });
}

function removeDatasetData(datasetName, user, onRemovedDataset) {
  DatasetRemovalTracker.track(datasetName);
  return async.waterfall([
    async.constant({datasetName, user}),
    findDatasetByNameAndValidateOwnership,
    lockDataset,
    _checkDefaultTransactionInDataset,
    _removeAllDataByDataset,
    _removeAllTransactions,
    _removeDataset
  ], (error) => {
    DatasetRemovalTracker.clean(datasetName);
    return onRemovedDataset(error);
  });
}

function findDatasetByNameAndValidateOwnership(externalContext, onDatasetValidated) {
  return DatasetsRepository.findByName(externalContext.datasetName, (datasetSearchError, dataset) => {
    if (datasetSearchError || !dataset) {
      return onDatasetValidated(datasetSearchError || `Dataset was not found for the given name: ${externalContext.datasetName}`);
    }

    return securityUtils.validateDatasetOwner({dataset, user: externalContext.user}, datasetValidationError => {
      if (datasetValidationError) {
        return onDatasetValidated(datasetValidationError);
      }

      externalContext.datasetId = dataset._id;
      externalContext.dataset = dataset;
      return onDatasetValidated(null, externalContext);
    });
  });
}

function lockDataset(externalContext, onDatasetLocked) {
  const datasetName = _.get(externalContext, 'dataset.name', externalContext.datasetName);
  return DatasetsRepository.lock(datasetName, (datasetLockError, dataset) => {
    if (datasetLockError) {
      return onDatasetLocked(datasetLockError);
    }

    if (!dataset) {
      return onDatasetLocked(`Version of dataset "${datasetName}" was already locked or dataset is absent`);
    }

    return onDatasetLocked(null, externalContext);
  });
}

function unlockDataset(externalContext, done) {
  return DatasetsRepository.unlock(externalContext.datasetName, (err, dataset) => {
    if (!dataset) {
      return done(`Version of dataset "${externalContext.datasetName}" wasn't locked`);
    }

    return done(err, externalContext);
  });
}

function _checkDefaultTransactionInDataset(externalContext, onTransactionsFound) {
  return DatasetTransactionsRepository.findDefault({datasetId: externalContext.datasetId}, (transactionsSearchError, defaultTransaction) => {
    if (transactionsSearchError) {
      return onTransactionsFound(transactionsSearchError);
    }

    if (defaultTransaction) {
      return DatasetsRepository.unlock(externalContext.datasetName, (datasetUnlockError) => {
        if (datasetUnlockError) {
          return onTransactionsFound(datasetUnlockError);
        }

        return onTransactionsFound('Default dataset couldn\'t be removed');
      });
    }

    return onTransactionsFound(null, externalContext);
  });
}

function _removeAllDataByDataset(externalContext, onDataRemoved) {
  const conceptsRepository = ConceptsRepositoryFactory.versionAgnostic();
  const entitiesRepository = EntitiesRepositoryFactory.versionAgnostic();

  return async.parallel([
    done => conceptsRepository.removeByDataset(externalContext.datasetId, (error, removeResult) => {
      if (error) {
        return done(error);
      }

      DatasetRemovalTracker
        .get(externalContext.datasetName)
        .increment(constants.CONCEPTS, removeResult.result.n);

      return done();
    }),
    done => entitiesRepository.removeByDataset(externalContext.datasetId, (error, removeResult) => {
      if (error) {
        return done(error);
      }

      DatasetRemovalTracker
        .get(externalContext.datasetName)
        .increment(constants.ENTITIES, removeResult.result.n);

      return done();
    }),
    done => removeDatapointsInChunks(externalContext, done),
    done => DatasetSchemaRepository.removeByDataset(externalContext.datasetId, done)
  ], (removingDataError) => {
    if (removingDataError) {
      return onDataRemoved(removingDataError);
    }
    return onDataRemoved(null, externalContext);
  });
}

function removeDatapointsInChunks({datasetId, datasetName}, onRemoved): void {
  const datapointsRepository = DatapointsRepositoryFactory.versionAgnostic();
  datapointsRepository.findIdsByDatasetAndLimit(datasetId, DATAPOINTS_TO_REMOVE_CHUNK_SIZE, (error, datapointIds) => {
    const amountOfDatapointsToRemove = _.size(datapointIds);
    logger.info('Removing datapoints', amountOfDatapointsToRemove);

    if (error) {
      logger.error('Datapoints removing error', error);
      return onRemoved(error);
    }

    if (_.isEmpty(datapointIds)) {
      return onRemoved(null);
    }

    datapointsRepository.removeByIds(datapointIds, error => {
      if (error) {
        return onRemoved(error);
      }

      DatasetRemovalTracker
        .get(datasetName)
        .increment(constants.DATAPOINTS, amountOfDatapointsToRemove);

      removeDatapointsInChunks({datasetId, datasetName}, onRemoved);
    });
  });
}

function getRemovalStateForDataset(datasetName: any, user: any, done: Function): any {
  return findDatasetByNameAndValidateOwnership({datasetName, user}, (error, externalContext: any)=> {
    if (error) {
      return done(error);
    }

    return done(null, DatasetRemovalTracker.get(datasetName).getState());
  });
}

function _removeAllTransactions(pipe, onTransactionsRemoved) {
  return DatasetTransactionsRepository.removeAllByDataset(pipe.datasetId, (error) => onTransactionsRemoved(error, pipe));
}

function _removeDataset(pipe, onDatasetRemoved) {
  return DatasetsRepository.removeById(pipe.datasetId, onDatasetRemoved);
}

function _findDatasetsByUser(pipe, done) {
  return DatasetsRepository.findByUser(pipe.userId, (datasetSearchError, datasets) => {
    if (datasetSearchError) {
      return done(datasetSearchError);
    }

    pipe.datasets = datasets;
    return done(null, pipe);
  });
}

function _collectVersionsForEachDataset(pipe, done) {
  return async.mapLimit(pipe.datasets, constants.LIMIT_NUMBER_PROCESS, _findAllCompletedVersionsByDataset, (collectingVersionsError, datasetsWithVersions) => {
    if (collectingVersionsError) {
      return done(collectingVersionsError);
    }

    return done(null, datasetsWithVersions);
  });
}

function _findAllCompletedVersionsByDataset(dataset, onTransactionsFound) {
  return DatasetTransactionsRepository.findAllCompletedByDataset(dataset._id, (transactionSearchError, transactions) => {
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
      isDefault: _.some(versions, version => version.isDefault),
      versions
    };

    return onTransactionsFound(null, datasetWithVersions);
  });
}
