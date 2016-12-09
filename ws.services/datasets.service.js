'use strict';

const _ = require('lodash');
const async = require('async');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const VersionedModelRepositoryFactory = require('../ws.repository/repository.factory');

const constants = require('../ws.utils/constants');

module.exports = {
  findDatasetsWithVersions,
  removeDatasetData
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

function removeDatasetData(datasetName, userId, onRemovedDataset) {
  return async.waterfall([
    async.constant({datasetName, userId}),
    _findDatasetByName,
    _checkDefaultTransactionInDataset,
    _removeAllDataByDataset,
    _removeAllTransactions,
    _removeDataset
  ], (error) => {
    return onRemovedDataset(error);
  });
}

function _findDatasetByName(pipe, onDatasetFound) {
  return datasetsRepository.findByNameAndUser(pipe.datasetName, pipe.userId, (datasetSearchError, dataset) => {
    if (datasetSearchError || !dataset) {
      return onDatasetFound(datasetSearchError || 'Dataset was not found');
    }

    if (dataset.isLocked) {
      return onDatasetFound('Dataset was locked');
    }

    pipe.datasetId = dataset._id;
    return onDatasetFound(null, pipe);
  });
}

function _checkDefaultTransactionInDataset(pipe, onTransactionsFound) {
  return transactionsRepository.findDefault({datasetId: pipe.datasetId}, (transactionsSearchError, defaultTransaction) => {
    if (transactionsSearchError) {
      return onTransactionsFound(transactionsSearchError);
    }

    if (defaultTransaction) {
      return onTransactionsFound('Default dataset couldn\'t be removed');
    }

    return onTransactionsFound(null, pipe);
  });
}

function _removeAllDataByDataset(pipe, onDataRemoved) {
  const retryConfig = {times: 3, interval: 3000};

  const tasksToRemove =
    _.chain([conceptsRepositoryFactory, entitiesRepositoryFactory, datapointsRepositoryFactory, datasetIndexRepository])
      .map(repositoryFactory => _toRemoveFunction(repositoryFactory, pipe.datasetId))
      .flatten()
      .map(rollbackTask => (done => async.retry(retryConfig, rollbackTask, done)))
      .value();

  return async.parallel(tasksToRemove, (removingDataError) => {
    if (removingDataError) {
      return onDataRemoved(removingDataError);
    }

    return onDataRemoved(null, pipe);
  })
}

function _toRemoveFunction(repositoryFactory, datasetId) {
  const repository = repositoryFactory instanceof VersionedModelRepositoryFactory ? repositoryFactory.versionAgnostic() : repositoryFactory;
  return repository.removeByDataset.bind(repository, datasetId);
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
  return async.mapLimit(pipe.datasets, constants.LIMIT_NUMBER_PROCESS, _findAllComplitedVersionsByDataset, (collectingVersionsError, datasetsWithVersions) => {
    if (collectingVersionsError) {
      return done(collectingVersionsError);
    }

    return done(null, datasetsWithVersions);
  });
}

function _findAllComplitedVersionsByDataset(dataset, onTransactionsFound) {
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
