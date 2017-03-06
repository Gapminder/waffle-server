import '../ws.config/config';
import * as _ from 'lodash';
import * as transactionsService from './dataset-transactions.service';

interface DatasetAndTransaction {
  dataset?: any;
  transaction?: any;
}

export {
  findDefaultDatasetAndTransaction,
  translateDocument
};

function findDefaultDatasetAndTransaction(pipe: any, done: Function): void {
  return transactionsService.findDefaultDatasetAndTransaction(pipe.datasetName, pipe.version, (error: any, datasetAndTransaction: DatasetAndTransaction) => {
    if (error) {
      return done(error);
    }

    if (!_.get(datasetAndTransaction, 'dataset', null)) {
      return done('Dataset isn\'t present in db.');
    }
    if (!_.get(datasetAndTransaction, 'transaction', null)) {
      return done('Transaction isn\'t present in db.');
    }

    const {dataset, transaction} = datasetAndTransaction;
    pipe.dataset = dataset;
    pipe.transaction = transaction;
    pipe.version = transaction.createdAt;

    return done(null, pipe);
  });
}

function translateDocument(target: any, language: string): any {
  if (!language) {
    return target.properties;
  }

  const translatedProperties = _.get(target.languages, language, {});
  if (_.isEmpty(translatedProperties)) {
    return target.properties;
  }

  return _.extend({}, target.properties, translatedProperties);
}
