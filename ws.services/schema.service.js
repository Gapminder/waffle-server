'use strict';

const _ = require("lodash");
const async = require("async");

const commonService = require('../ws.services/common.service');
const schemaQueryNormalizer = require('../ws.ddfql/ddf-schema-query-normalizer');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');
const ddfQueryValidator = require('../ws.ddfql/ddf-query-validator');

module.exports = {
  findSchemaByDdfql
};

function findSchemaByDdfql(options, onFound) {
  return async.waterfall([
    async.constant(options),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    _findSchemaByDdfql
  ], onFound);
}

function _findSchemaByDdfql(pipe, done) {
  const normalizedQuery = schemaQueryNormalizer.normalize(pipe.query, {transactionId: pipe.transaction._id});

  const validateQuery = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
  if(!validateQuery.valid) {
    return done(validateQuery.log, pipe);
  }

  return datasetIndexRepository.findByDdfql(normalizedQuery, (error, schemaData) => {
    if (error) {
      return done(error);
    }

    return done(null, {
      schema: schemaData,
      headers: _.keys(normalizedQuery.select),
      aliases: normalizedQuery.aliases,
      query: pipe.query
    });
  });
}
