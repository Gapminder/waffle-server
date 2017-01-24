import * as _ from 'lodash';
import { model, MongooseDocument } from 'mongoose';

const DatasetTransactions = model('DatasetTransactions');

function DatasetTransactionsRepository() {
}

DatasetTransactionsRepository.prototype._findLatestByQuery = function (query, done) {
  return DatasetTransactions
    .find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error, transactions: any[]) => {
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
  return DatasetTransactions.findOne({dataset: datasetId, commit}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.removeById = function (transactionId, done) {
  return DatasetTransactions.findOneAndRemove({_id: transactionId}, done);
};

DatasetTransactionsRepository.prototype.removeAllByDataset = function (datasetId, done) {
  return DatasetTransactions.remove({dataset: datasetId}, done);
};

DatasetTransactionsRepository.prototype.findAllCompletedByDataset = function (datasetId, done) {
  return DatasetTransactions.find({dataset: datasetId, isClosed: true}).sort({createdAt: -1}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.findAllByDataset = function (datasetId, done) {
  return DatasetTransactions.find({dataset: datasetId}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.setLastError = function (transactionId, lastErrorMessage, done) {
  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {lastError: lastErrorMessage}}, {'new': true}, done);
};

DatasetTransactionsRepository.prototype.create = function (transaction, onCreated) {
  return DatasetTransactions.create(transaction, (error, model: MongooseDocument) => {
    if (error) {
      return onCreated(error);
    }
    return onCreated(null, model.toObject());
  });
};

DatasetTransactionsRepository.prototype.countByDataset = function (datasetId, onCounted) {
  return DatasetTransactions.count({dataset: datasetId}, onCounted);
};

DatasetTransactionsRepository.prototype.closeTransaction = function ({transactionId, transactionStartTime}, onClosed) {
  if (!transactionId) {
    return onClosed('TransactionId is required');
  }

  const properties: any = {isClosed: true};
  if (transactionStartTime) {
    properties.timeSpentInMillis = Date.now() - transactionStartTime;
  }

  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: properties}, onClosed);
};

DatasetTransactionsRepository.prototype.setLanguages = function ({transactionId, languages}, onLanguagesSet) {
  return DatasetTransactions.update({_id: transactionId}, {$set: {languages}}).exec(onLanguagesSet);
};

DatasetTransactionsRepository.prototype.establishForDataset = function ({transactionId, datasetId}, onEstablished) {
  if (!transactionId) {
    return onEstablished('TransactionId is required');
  }

  if (!datasetId) {
    return onEstablished('DatasetId is required');
  }

  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {dataset: datasetId}}, {'new': true}, onEstablished);
};

DatasetTransactionsRepository.prototype.updateLanguages = function ({languages, transactionId}, onLanguagesUpdated) {
  if (!transactionId) {
    return onLanguagesUpdated('TransactionId is required');
  }

  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {languages: languages}}, {'new': true}, onLanguagesUpdated);
};

DatasetTransactionsRepository.prototype.findDefault = function (options, onDefaultFound) {
  const queryParams: any = {};
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

  return DatasetTransactions.findOneAndUpdate(currentDefaultTxQuery, {$set: {isDefault: false}}, {'new': true}, resetDefaultTransactionError => {
    if (resetDefaultTransactionError) {
      return onSetAsDefault(resetDefaultTransactionError);
    }

    const txToSetAsDefaultQuery = {_id: transactionId, dataset: datasetId, createdBy: userId};
    return DatasetTransactions.findOneAndUpdate(txToSetAsDefaultQuery, {$set: {isDefault: true}}, {'new': true}, onSetAsDefault);
  });
};

const repository = new DatasetTransactionsRepository();
export { repository as DatasetTransactionsRepository };
