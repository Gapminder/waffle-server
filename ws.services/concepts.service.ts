import * as _ from 'lodash';
import * as async from 'async';

import * as commonService from './common.service';
import * as ddfql from '../ws.ddfql/ddf-concepts-query-normalizer';
import * as conceptsRepositoryFactory from '../ws.repository/ddf/concepts/concepts.repository';
import * as ddfQueryValidator from '../ws.ddfql/ddf-query-validator';

//todo: move interface to ddfQueryValidator
interface ValidateQuery {
  valid: boolean,
  messages?: Array<string>,
  log?: string
}

export {
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

  const validateQuery:ValidateQuery = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
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
