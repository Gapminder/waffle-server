import * as _ from 'lodash';
import * as async from 'async';
import * as commonService from './common.service';
import * as schemaQueryNormalizer from '../ws.ddfql/ddf-schema-query-normalizer';
import {DatasetSchemaRepository} from '../ws.repository/ddf/dataset-index/dataset-index.repository';
import * as ddfQueryValidator from '../ws.ddfql/ddf-query-validator';
import {ValidateQueryModel} from '../ws.ddfql/ddf-query-validator';

export {
  findSchemaByDdfql
};

function findSchemaByDdfql(options: any, onFound: AsyncResultCallback<any, any>): void {
  return async.waterfall([
    async.constant(options),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    _findSchemaByDdfql
  ], onFound);
}

function _findSchemaByDdfql(pipe: any, done: Function): void {
  const normalizedQuery = schemaQueryNormalizer.normalize(pipe.query, {transactionId: pipe.transaction._id});

  const validateQuery: ValidateQueryModel = ddfQueryValidator.validateMongoQuery(normalizedQuery.where);
  if(!validateQuery.valid) {
    return done(validateQuery.log, pipe);
  }

  return DatasetSchemaRepository.findByDdfql(normalizedQuery, (error: any, schemaData: any) => {
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
