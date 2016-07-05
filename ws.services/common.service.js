'use strict';

const transactionsService = require('./dataset-transactions.service');

module.exports = {
  findDefaultDatasetAndTransaction
};

function findDefaultDatasetAndTransaction(pipe, done) {
  return transactionsService.findDefaultDatasetAndTransaction(pipe.datasetName, pipe.version, (error, datasetAndTransaction) => {
    if (error) {
      return done(error);
    }

    pipe.dataset = datasetAndTransaction.dataset;
    pipe.transaction = datasetAndTransaction.transaction;
    pipe.version = datasetAndTransaction.transaction.createdAt;
    return done(null, pipe);
  });
}
