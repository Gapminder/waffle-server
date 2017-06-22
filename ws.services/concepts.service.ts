import * as _ from 'lodash';
import * as async from 'async';

import * as commonService from './common.service';
import * as ddfql from '../ws.ddfql/ddf-concepts-query-normalizer';
import { ConceptsRepositoryFactory } from '../ws.repository/ddf/concepts/concepts.repository';
import * as ddfQueryValidator from '../ws.ddfql/ddf-query-validator';
import { ValidateQueryModel } from '../ws.ddfql/ddf-query-validator';

export {
  getConcepts,
  collectConceptsByDdfql
};

function collectConceptsByDdfql(options: any, cb: Function): void {
  console.time('finish Concepts stats');
  const pipe = _.extend(options, { domainGid: _.first(options.domainGids) });

  return async.waterfall([
    async.constant(pipe),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    getAllConcepts,
    getConceptsByDdfql
  ], (error: string, result: any) => {
    console.timeEnd('finish Concepts stats');

    return cb(error, result);
  });
}

function getAllConcepts(pipe: any, cb: Function): void {
  const conceptsRepository = ConceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  conceptsRepository
    .findConceptsByQuery({}, (error: string, concepts: any) => {
      if (error) {
        return cb(error);
      }

      pipe.allConcepts = concepts;

      return cb(null, pipe);
    });
}

function getConceptsByDdfql(pipe: any, cb: Function): void {
  const conceptsRepository = ConceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);
  const normalizedQuery = ddfql.normalizeConcepts(pipe.query, pipe.allConcepts);

  const validateQuery: ValidateQueryModel = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
  if (!validateQuery.valid) {
    return cb(validateQuery.log, pipe);
  }

  conceptsRepository
    .findConceptsByQuery(normalizedQuery.where, (error: string, concepts: any) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return cb(null, pipe);
    });
}

function getConcepts(pipe: any, cb: Function): void {
  const conceptsRepository = ConceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  conceptsRepository
    .findConceptProperties(pipe.headers, pipe.where, (error: string, concepts: any) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return cb(null, pipe);
    });
}
