'use strict';

const _ = require('lodash');
const compression = require('compression');
const transactionsService = require('./dataset-transactions.service');
const constants = require('../ws.utils/constants');

module.exports = {
  findDefaultDatasetAndTransaction,
  shouldCompress,
  translate
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

function translate(translationTargetName, pipe, done) {
  if (!_.includes(pipe.transaction.languages, pipe.language)) {
    return done(null, pipe);
  }

  pipe[translationTargetName] = _.map(pipe[translationTargetName], target => {
    target.properties = _.mapValues(target.properties, (value, key) => {
      return target.languages[pipe.language][key] || value;
    });
    return target;
  });

  return done(null, pipe);
}
