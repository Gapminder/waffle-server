import * as _ from 'lodash';
import { model, MongooseDocument } from 'mongoose';

const DatasetTransactions = model('DatasetTransactions');

// TODO: It should be rewrited as a TS class
/* tslint:disable-next-line:no-empty */
function DatasetTransactionsRepository(): void {
}

DatasetTransactionsRepository.prototype._findLatestByQuery = function (query: any, done: Function): Promise<Object> {
  return DatasetTransactions
    .find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error: string, transactions: any[]) => {
      return done(error, _.first(transactions));
    });
};

DatasetTransactionsRepository.prototype.findLatestByDataset = function (datasetId: any, done: Function): void {
  /* tslint:disable-next-line:no-invalid-this */
  return this._findLatestByQuery({dataset: datasetId}, done);
};

DatasetTransactionsRepository.prototype.findLatestCompletedByDataset = function (datasetId: any, done: Function): void {
  /* tslint:disable-next-line:no-invalid-this */
  return this._findLatestByQuery({dataset: datasetId, isClosed: true, lastError: {$exists: false}}, done);
};

DatasetTransactionsRepository.prototype.findLatestFailedByDataset = function (datasetId: string, done: Function): void {
  /* tslint:disable-next-line:no-invalid-this */
  return this._findLatestByQuery({dataset: datasetId, lastError: {$exists: true}}, done);
};

DatasetTransactionsRepository.prototype.findByDatasetAndCommit = function (datasetId: any, commit: any, done: Function): Promise<Object> {
  return DatasetTransactions.findOne({dataset: datasetId, commit}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.removeById = function (transactionId: any, done: Function): any {
  return DatasetTransactions.findOneAndRemove({_id: transactionId}, done);
};

DatasetTransactionsRepository.prototype.removeAllByDataset = function (datasetId: any, done: (err: any) => void): any {
  return DatasetTransactions.remove({dataset: datasetId}, done);
};

DatasetTransactionsRepository.prototype.findAllCompletedByDataset = function (datasetId: any, done: Function): any {
  return DatasetTransactions.find({dataset: datasetId, isClosed: true}).sort({createdAt: -1}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.findAllByDataset = function (datasetId: any, done: Function): Promise<Object> {
  return DatasetTransactions.find({dataset: datasetId}).lean().exec(done);
};

DatasetTransactionsRepository.prototype.setLastError = function (transactionId: any, lastErrorMessage: string, done: (err: any) => void): any {
  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {lastError: lastErrorMessage}}, {new: true}, done);
};

DatasetTransactionsRepository.prototype.create = function (transaction: any, onCreated: Function): any {
  return DatasetTransactions.create(transaction, (error: string, model: MongooseDocument) => {
    if (error) {
      return onCreated(error);
    }
    return onCreated(null, model.toObject());
  });
};

DatasetTransactionsRepository.prototype.countByDataset = function (datasetId: any, onCounted: (err: any, count: number) => void): any {
  return DatasetTransactions.count({dataset: datasetId}, onCounted);
};

DatasetTransactionsRepository.prototype.closeTransaction = function ({transactionId, transactionStartTime}: any, onClosed: Function): any {
  if (!transactionId) {
    return onClosed('TransactionId is required');
  }

  const properties: any = {isClosed: true};
  if (transactionStartTime) {
    properties.timeSpentInMillis = Date.now() - transactionStartTime;
  }

  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: properties}, onClosed);
};

DatasetTransactionsRepository.prototype.setLanguages = function ({transactionId, languages}: any, onLanguagesSet: Function): Promise<any> {
  return DatasetTransactions.update({_id: transactionId}, {$set: {languages}}).exec(onLanguagesSet);
};

DatasetTransactionsRepository.prototype.establishForDataset = function ({transactionId, datasetId}: any, onEstablished: Function): any {
  if (!transactionId) {
    return onEstablished('TransactionId is required');
  }

  if (!datasetId) {
    return onEstablished('DatasetId is required');
  }

  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {dataset: datasetId}}, {new: true}, onEstablished as any);
};

DatasetTransactionsRepository.prototype.updateLanguages = function ({languages, transactionId}: any, onLanguagesUpdated: Function): any {
  if (!transactionId) {
    return onLanguagesUpdated('TransactionId is required');
  }

  return DatasetTransactions.findOneAndUpdate({_id: transactionId}, {$set: {languages}}, {new: true}, onLanguagesUpdated as any);
};

DatasetTransactionsRepository.prototype.findDefault = function (options: any, onDefaultFound: Function): Promise<Object> {
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

DatasetTransactionsRepository.prototype.setAsDefault = function (userId: any, datasetId: any, transactionId: any, onSetAsDefault: Function): any {
  const currentDefaultTxQuery = {createdBy: userId, isDefault: true};

  return DatasetTransactions.findOneAndUpdate(currentDefaultTxQuery, {$set: {isDefault: false}}, {new: true}, (resetDefaultTransactionError: string) => {
    if (resetDefaultTransactionError) {
      return onSetAsDefault(resetDefaultTransactionError);
    }

    const txToSetAsDefaultQuery = {_id: transactionId, dataset: datasetId, createdBy: userId};
    return DatasetTransactions.findOneAndUpdate(txToSetAsDefaultQuery, {$set: {isDefault: true}}, {new: true}, onSetAsDefault as any);
  });
};

const repository = new DatasetTransactionsRepository();
export { repository as DatasetTransactionsRepository };
