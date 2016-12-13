'use strict';

const _ = require('lodash');
const async = require('async');

const ddfql = require('../ws.ddfql/ddf-concepts-query-normalizer');
const constants = require('../ws.utils/constants');
const commonService = require('./common.service');
const ddfQueryValidator = require('../ws.ddfql/ddf-query-validator');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');

module.exports = {
  getConcepts,
  collectConceptsByDdfql
};

function collectConceptsByDdfql(options, cb) {
  console.time('finish Concepts stats');
  const pipe = _.extend(options, {domainGid: _.first(options.domainGids)});

  return async.waterfall([
    async.constant(pipe),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    getAllConcepts,
    getConceptsByDdfql
  ], (error, result) => {
    console.timeEnd('finish Concepts stats');

    return cb(error, result);
  });
}

function getAllConcepts(pipe, cb) {
  const conceptsRepository = conceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  conceptsRepository
    .findConceptsByQuery({}, (error, concepts) => {
      if (error) {
        return cb(error);
      }

      pipe.allConcepts = concepts;

      return cb(null, pipe);
    });
}

function getConceptsByDdfql(pipe, cb) {
  const conceptsRepository = conceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);
  const normalizedQuery = ddfql.normalizeConcepts(pipe.query, pipe.allConcepts);

  const validateQuery = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
  if(!validateQuery.valid) {
    return cb(validateQuery.log, pipe);
  }

  conceptsRepository
    .findConceptsByQuery(normalizedQuery.where, (error, concepts) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return cb(null, pipe);
    });
}

function getConcepts(pipe, cb) {
  const conceptsRepository = conceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  conceptsRepository
    .findConceptProperties(pipe.headers, pipe.where, (error, concepts) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return cb(null, pipe);
    });
}
