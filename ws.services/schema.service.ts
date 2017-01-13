import * as _ from 'lodash';
import * as async from 'async';

import * as commonService from './common.service';
import * as schemaQueryNormalizer from '../ws.ddfql/ddf-schema-query-normalizer';
import * as datasetIndexRepository from '../ws.repository/ddf/dataset-index/dataset-index.repository';
import * as ddfQueryValidator from '../ws.ddfql/ddf-query-validator';

//todo: move interface to ddfQueryValidator
interface ValidateQuery {
  valid: boolean,
  messages?: Array<string>,
  log?: string
}

export {
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

  const validateQuery:ValidateQuery = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
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
