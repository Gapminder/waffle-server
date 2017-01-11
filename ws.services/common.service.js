'use strict';

const _ = require('lodash');

const config = require('../ws.config/config');
const transactionsService = require('./dataset-transactions.service');

module.exports = {
  findDefaultDatasetAndTransaction,
  translateDocument
};

function findDefaultDatasetAndTransaction(pipe, done) {
  return transactionsService.findDefaultDatasetAndTransaction(pipe.datasetName, pipe.version, (error, {dataset, transaction} = {}) => {
    if (error) {
      return done(error);
    }

    pipe.dataset = dataset;
    pipe.transaction = transaction;
    pipe.version = transaction.createdAt;

    return done(null, pipe);
  });
}

function translateDocument(target, language) {
  if (!language) {
    return target.properties;
  }

  const translatedProperties = _.get(target.languages, language, {});
  if (_.isEmpty(translatedProperties)) {
    return target.properties;
  }

  return _.reduce(target.properties, (result, value, prop) => {
    result[prop] = translatedProperties[prop] || value;
    return result;
  }, {});
}
