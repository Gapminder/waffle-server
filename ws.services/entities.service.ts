import * as _ from 'lodash';
import * as async from 'async';
import * as ddfql from '../ws.ddfql/ddf-entities-query-normalizer';
import * as commonService from './common.service';
import * as conceptsService from './concepts.service';
import * as ddfQueryValidator from '../ws.ddfql/ddf-query-validator';
import { ValidateQueryModel } from '../ws.ddfql/ddf-query-validator';

import { EntitiesRepositoryFactory } from '../ws.repository/ddf/entities/entities.repository';

export {
  getEntities,
  collectEntitiesByDdfql
};

function collectEntitiesByDdfql(options: any, cb: AsyncResultCallback<any, any>): void {
  console.time('finish Entities stats');
  const pipe = _.extend(options, { domainGid: _.first(options.domainGids) });

  async.waterfall([
    async.constant(pipe),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    normalizeQueriesToEntitiesByDdfql
  ], (error: string, result: any) => {
    console.timeEnd('finish Entities stats');

    return cb(error, result);
  });
}

function normalizeQueriesToEntitiesByDdfql(pipe: any, cb: Function): void {
  const entitiesRepository = EntitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  const normlizedQuery = ddfql.normalizeEntities(pipe.query, pipe.concepts);

  return async.mapValuesLimit(normlizedQuery.join, 10, (item: any, link: any, mcb: Function) => {
    const validateQuery: ValidateQueryModel = ddfQueryValidator.validateMongoQuery(item);
    if (!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }
    return entitiesRepository
      .findEntityPropertiesByQuery(item, (error: string, entities: any) => {
        return mcb(error, _.map(entities, 'gid'));
      });
  }, (err: any, substituteJoinLinks: any) => {
    const promotedQuery = ddfql.substituteEntityJoinLinks(normlizedQuery, substituteJoinLinks);
    const subEntityQuery = promotedQuery.where;

    const validateQuery: ValidateQueryModel = ddfQueryValidator.validateMongoQuery(subEntityQuery);
    if (!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }

    return entitiesRepository
      .findEntityPropertiesByQuery(subEntityQuery, (error: string, entities: any) => {
        if (error) {
          return cb(error);
        }

        pipe.entities = entities;

        return cb(null, pipe);
      });
  });
}

function getEntities(pipe: any, cb: Function): void {
  const entitiesRepository = EntitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  entitiesRepository
    .findEntityProperties(pipe.domainGid, pipe.headers, pipe.where, (error: string, entities: any) => {
      if (error) {
        return cb(error);
      }

      pipe.entities = entities;

      return cb(null, pipe);
    });
}

function getConcepts(pipe: any, cb: Function): void {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    headers: [],
    where: {}
  };

  return conceptsService.getConcepts(_pipe, (err: any, result: any) => {
    if (err) {
      return cb(err);
    }

    if (!result) {
      return cb('Concepts are not found');
    }

    pipe.concepts = result.concepts;
    return cb(null, pipe);
  });
}
