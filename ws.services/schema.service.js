'use strict';

const _ = require("lodash");
const async = require("async");

const commonService = require('../ws.services/common.service');
const ddfQueryValidator = require('../ws.ddfql/ddf-query-validator');
const schemaQueryNormalizer = require('../ws.ddfql/ddf-schema-query-normalizer');
const datasetIndexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');

const AMOUNT_OF_QUERIES_EXECUTED_IN_PARALLEL = 3;
const MAX_AMOUNT_OF_QUERIES_INFERRED_FROM_VARS = 25;

module.exports = {
  findSchemaByDdfql
};

function findSchemaByDdfql(query, onFound) {
  return async.waterfall([
    async.constant({query}),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    _findSchemaByDdfql
  ], onFound);
}

function _findSchemaByDdfql(pipe, done) {
  const normalizedJoin = schemaQueryNormalizer.normalizeJoin(pipe.query);

  return async.mapLimit(normalizedJoin.join, AMOUNT_OF_QUERIES_EXECUTED_IN_PARALLEL, populateJoinLinks(pipe),
    (error, linksInJoinToValues) => {
      if (error) {
        return done(error);
      }

      const normalizedQueriesAmount = schemaQueryNormalizer.calcNormalizedQueriesAmount(pipe.query, linksInJoinToValues);
      if (normalizedQueriesAmount > MAX_AMOUNT_OF_QUERIES_INFERRED_FROM_VARS) {
        return done(`Abuse of variables in query detected: cartesian product estimation is ${normalizedQueriesAmount}`);
      }

      const normalizedQueries = schemaQueryNormalizer.normalize(pipe.query, {
        transactionId: pipe.transaction._id,
        linksInJoinToValues
      });

      if (_.isError(normalizedQueries)) {
        return done(normalizedQueries);
      }

      return executeDdfqlSchemaQueries(normalizedQueries, pipe, done);
    });
}

function populateJoinLinks(pipe) {
  return (joinQuery, onQueryExecuted) => {
    const validateQuery = ddfQueryValidator.validateMongoQuery(joinQuery);
    if (!validateQuery.valid) {
      return onQueryExecuted(validateQuery.log);
    }

    return conceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version)
      .findConceptsByQuery(joinQuery, (error, concepts) => {
        if (error) {
          return onQueryExecuted(error);
        }
        return onQueryExecuted(null, _.map(concepts, 'gid'));
      });
  };
}

function executeDdfqlSchemaQueries(normalizedQueries, pipe, onExecuted) {
  return async.mapLimit(normalizedQueries, AMOUNT_OF_QUERIES_EXECUTED_IN_PARALLEL, executeDdfqlSchemaQuery(pipe),
    (error, schemaChunks) => {
      if (error) {
        return onExecuted(error);
      }

      const selectKey = _.get(pipe, 'query.select.key', []);
      const selectValue = _.get(pipe, 'query.select.value', []);
      return onExecuted(null, {originalHeaders: _.union(selectKey, selectValue), schemaChunks});
    });
}

function executeDdfqlSchemaQuery(pipe) {
  return (normalizedQuery, onQueryExecuted) => {

    const validateQuery = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
    if (!validateQuery.valid) {
      return onQueryExecuted(validateQuery.log);
    }

    return datasetIndexRepository.findByDdfql(normalizedQuery, (error, schemaData) => {
      if (error) {
        return onQueryExecuted(error);
      }

      return onQueryExecuted(null, {
        schema: schemaData,
        headers: _.keys(normalizedQuery.select),
        aliases: normalizedQuery.aliases,
        query: pipe.query
      });
    });
  };
}
