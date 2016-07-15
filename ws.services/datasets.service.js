'use strict';

const _ = require('lodash');
const async = require('async');

const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const constants = require('../ws.utils/constants');

module.exports = {
  findDatasetsWithVersions
};

function findDatasetsWithVersions(userId, onFound) {
  return async.waterfall([
    async.constant({}),
    _findDatasetByUser,
    _collectVersionsForEachDataset
  ], (error, datasetsWithVersions) => {
    return onFound(error, datasetsWithVersions);
  });

  function _findDatasetByUser(pipe, done) {
    return datasetsRepository.findByUser(userId, (datasetSearchError, datasets) => {
      if (datasetSearchError) {
        return done(datasetSearchError);
      }

      pipe.datasets = datasets;
      return done(null, pipe);
    });
  }

  function _collectVersionsForEachDataset(pipe, done) {
    return async.mapLimit(pipe.datasets, constants.LIMIT_NUMBER_PROCESS, (dataset, onTransactionsFound) => {
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
    }, (collectingVersionsError, datasetsWithVersions) => {
      if (collectingVersionsError) {
        return done(collectingVersionsError);
      }

      return done(null, datasetsWithVersions);
    });
  }
}
