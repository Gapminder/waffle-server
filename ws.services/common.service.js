'use strict';

const _ = require('lodash');
const compression = require('compression');
const transactionsService = require('./dataset-transactions.service');

module.exports = {
  findDefaultDatasetAndTransaction,
  shouldCompress
};

function shouldCompress(req, res) {
  if (req.query['no-compression'] && !_.includes(['production', 'stage'], process.env.NODE_ENV)) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}

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
