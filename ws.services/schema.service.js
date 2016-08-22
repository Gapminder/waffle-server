'use strict';

const _ = require("lodash");
const async = require("async");

const commonService = require('../ws.services/common.service');
const schemaQueryNormalizer = require('../ws.ddfql/ddf-schema-query-normalizer');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');

module.exports = {
  findSchemaByDdfql
};

function findSchemaByDdfql(query, onFound) {
  return async.waterfall([
    async.constant({query}),
    commonService.findDefaultDatasetAndTransaction,
    _findSchemaByDdfql
  ], onFound);
}

function _findSchemaByDdfql(pipe, done) {
  const normalizedQuery = schemaQueryNormalizer.normalize(pipe.query, {transactionId: pipe.transaction._id});
  return datasetIndexRepository.findByDdfql(normalizedQuery, (error, schemaData) => {
    if (error) {
      return done(error);
    }

    return done(null, {schema: schemaData, headers: _.keys(normalizedQuery.select), aliases: normalizedQuery.aliases});
  });
}
