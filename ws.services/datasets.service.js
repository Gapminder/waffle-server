'use strict';

const _ = require('lodash');
const async = require('async');
const securityUtils = require('../ws.utils/security');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');

const constants = require('../ws.utils/constants');

module.exports = {
  findDatasetsWithVersions,
  removeDatasetData,
  findDatasetByNameAndValidateOwnership
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
  return async.waterfall([
    async.constant({datasetName, user}),
    findDatasetByNameAndValidateOwnership,
    _lockDataset,
    _checkDefaultTransactionInDataset,
    _removeAllDataByDataset,
    _removeAllTransactions,
    _removeDataset
  ], (error) => {
    return onRemovedDataset(error);
  });
}

function findDatasetByNameAndValidateOwnership(externalContext, onDatasetValidated) {
  return datasetsRepository.findByName(externalContext.datasetName, (datasetSearchError, dataset) => {
    if (datasetSearchError || !dataset) {
      return onDatasetValidated(datasetSearchError || `Dataset was not found for the given name: ${externalContext.datasetName}`);
    }

    return securityUtils.validateDatasetOwner({dataset, user: externalContext.user}, datasetValidationError => {
      if (datasetValidationError) {
        return onDatasetValidated(datasetValidationError);
      }

      externalContext.datasetId = dataset._id;
      return onDatasetValidated(null, externalContext);
    });
  });
}

function _lockDataset(externalContext, onDatasetLocked) {
  return datasetsRepository.lock(externalContext.datasetName, (datasetLockError, dataset) => {
    if (datasetLockError) {
      return onDatasetLocked(datasetLockError);
    }

    if (!dataset) {
      return onDatasetLocked(`Version of dataset "${externalContext.datasetName}" was already locked`);
    }

    return onDatasetLocked(null, externalContext);
  });
}

function _checkDefaultTransactionInDataset(externalContext, onTransactionsFound) {
  return transactionsRepository.findDefault({datasetId: externalContext.datasetId}, (transactionsSearchError, defaultTransaction) => {
    if (transactionsSearchError) {
      return onTransactionsFound(transactionsSearchError);
    }

    if (defaultTransaction) {
      return datasetsRepository.unlock(externalContext.datasetName, (datasetUnlockError) => {
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
  const retryConfig = {times: 3, interval: 3000};
  const conceptsRepository = conceptsRepositoryFactory.versionAgnostic();
  const entitiesRepository = entitiesRepositoryFactory.versionAgnostic();
  const datapointsRepository = datapointsRepositoryFactory.versionAgnostic();

  return async.parallel([
    async.retry(retryConfig, async.apply(conceptsRepository.removeByDataset, externalContext.datasetId)),
    async.retry(retryConfig, async.apply(entitiesRepository.removeByDataset, externalContext.datasetId)),
    async.retry(retryConfig, async.apply(datapointsRepository.removeByDataset, externalContext.datasetId)),
    async.retry(retryConfig, async.apply(datasetIndexRepository.removeByDataset, externalContext.datasetId))
  ], (removingDataError) => {
    if (removingDataError) {
      return onDataRemoved(removingDataError);
    }

    return onDataRemoved(null, externalContext);
  });
}

function _removeAllTransactions(pipe, onTransactionsRemoved) {
  return transactionsRepository.removeAllByDataset(pipe.datasetId, (error) => onTransactionsRemoved(error, pipe));
}

function _removeDataset(pipe, onDatasetRemoved) {
  return datasetsRepository.removeById(pipe.datasetId, onDatasetRemoved);
}

function _findDatasetsByUser(pipe, done) {
  return datasetsRepository.findByUser(pipe.userId, (datasetSearchError, datasets) => {
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
  return transactionsRepository.findAllCompletedByDataset(dataset._id, (transactionSearchError, transactions) => {
    if (transactionSearchError) {
      return onTransactionsFound(transactionSearchError);
    }

    const versions = _.map(transactions, transaction => {
      return {
        commit: transaction.commit,
        isDefault: transaction.isDefault,
        createdAt: new Date(transaction.createdAt)
      };
    });

    const datasetWithVersions = {
      id: dataset._id,
      name: dataset.name,
      isDefault: _.some(versions, version => version.isDefault),
      versions
    };

    return onTransactionsFound(null, datasetWithVersions);
  });
}
