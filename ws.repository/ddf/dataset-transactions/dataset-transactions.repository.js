'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const DatasetTransactions = mongoose.model('DatasetTransactions');

function DatasetTransactionsRepository() {
}

DatasetTransactionsRepository.prototype._findLatestByQuery = function (query, done) {
  return DatasetTransactions
    .find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error, transactions) => {
      return done(error, _.first(transactions));
    });
};

DatasetTransactionsRepository.prototype.findLatestByDataset = function (datasetId, done) {
  return this._findLatestByQuery({dataset: datasetId}, done);
};

DatasetTransactionsRepository.prototype.findLatestCompletedByDataset = function (datasetId, done) {
  return this._findLatestByQuery({dataset: datasetId, isClosed: true, lastError: {$exists: false}}, done);
};

DatasetTransactionsRepository.prototype.findLatestFailedByDataset = function (datasetId, done) {
  return this._findLatestByQuery({dataset: datasetId, lastError: {$exists: true}}, done);
};

DatasetTransactionsRepository.prototype.findByDatasetAndCommit = function (datasetId, commit, done) {
  return DatasetTransactions
    .findOne({dataset: datasetId, commit})
    .lean()
    .exec((error, transaction) => {
      return done(error, transaction);
    });
};

DatasetTransactionsRepository.prototype.removeById = function (transactionId, done) {
  return DatasetTransactions.findOneAndRemove({_id: transactionId}, done);
};

DatasetTransactionsRepository.prototype.findAllCompletedByDataset = function (datasetId, done) {
  return DatasetTransactions.find({dataset: datasetId, isClosed: true}).sort({createdAt: -1}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.setLastError = function (transactionId, lastErrorMessage, done) {
  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {lastError: lastErrorMessage}}, {new: 1}, done);
};

DatasetTransactionsRepository.prototype.findDefault = function (options, onDefaultFound) {
  const queryParams = {};
  if (options.datasetId) {
    queryParams.dataset = options.datasetId;
  }

  if (options.commit) {
    queryParams.commit = options.commit;
  }

  let query = DatasetTransactions.findOne(_.merge(queryParams, {isDefault: true}));

  if (options.populateDataset) {
    query = query.populate('dataset');
  }

  return query.lean().exec(onDefaultFound);
};

DatasetTransactionsRepository.prototype.setAsDefault = function (userId, datasetId, transactionId, onSetAsDefault) {
  const currentDefaultTxQuery = {createdBy: userId, isDefault: true};

  return DatasetTransactions.findOneAndUpdate(currentDefaultTxQuery, {$set: {isDefault: false}}, {new: 1}, resetDefaultTransactionError => {
    if (resetDefaultTransactionError) {
      return onSetAsDefault(resetDefaultTransactionError);
    }

    const txToSetAsDefaultQuery = {_id: transactionId, dataset: datasetId, createdBy: userId};
    return DatasetTransactions.findOneAndUpdate(txToSetAsDefaultQuery, {$set: {isDefault: true}}, {new: 1}, onSetAsDefault);
  });
};

module.exports = new DatasetTransactionsRepository();
