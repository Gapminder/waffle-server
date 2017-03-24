import * as _ from 'lodash';
import * as async from 'async';
import * as ddfql from '../ws.ddfql/ddf-datapoints-query-normalizer';
import { logger } from '../ws.config/log';
import {constants} from '../ws.utils/constants';
import * as commonService from './common.service';
import * as conceptsService from './concepts.service';
import * as entitiesService from './entities.service';
import * as ddfQueryValidator from '../ws.ddfql/ddf-query-validator';
import {EntitiesRepositoryFactory} from '../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../ws.repository/ddf/data-points/data-points.repository';
import {ValidateQueryModel} from '../ws.ddfql/ddf-query-validator';

export {
  collectDatapointsByDdfql
};

function collectDatapointsByDdfql(options: any, onMatchedDatapoints: AsyncResultCallback<any, any>): void {
  console.time('finish matching DataPoints');
  const pipe = {
    user: options.user,
    select: options.select,
    headers: options.headers,
    domainGids: options.domainGids,
    where: options.where,
    query: options.query,
    sort: options.sort,
    groupBy: options.groupBy,
    datasetName: options.datasetName,
    language: options.language,
    version: options.version
  };

  return async.waterfall([
    async.constant(pipe),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    mapConcepts,
    getEntitiesByDdfql,
    normalizeQueriesToDatapointsByDdfql
  ], (error: any, result: any) => {
    console.timeEnd('finish matching DataPoints');

    return onMatchedDatapoints(error, result);
  });
}

function getEntitiesByDdfql(pipe: any, cb: Function): void {
  return async.map(pipe.resolvedDomainsAndSetGids, _getEntitiesByDomainOrSetGid, (err: any, result: any) => {
    pipe.entityOriginIdsGroupedByDomain = _.mapValues(result, (value: any) => _.map(value, constants.ORIGIN_ID));
    pipe.entities = _.flatMap(result);

    return cb(err, pipe);
  });

  function _getEntitiesByDomainOrSetGid(domainGid: string, mcb: Function): void {
    const _pipe = {
      dataset: pipe.dataset,
      version: pipe.version,
      domainGid,
      headers: [],
      where: {}
    };

    return entitiesService.getEntities(_pipe, (err: any, result: any) => {
      if (err) {
        return mcb(err);
      }
      return mcb(err, result.entities);
    });
  }
}

function normalizeQueriesToDatapointsByDdfql(pipe: any, cb: Function): void {
  console.time('get datapoints');

  if (_.isEmpty(pipe.measures)) {
    const error = 'Measure should present in select property';
    logger.error(error);
    return cb(error, pipe);
  }

  const entitiesRepository = EntitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);
  const normalizedQuery = ddfql.normalizeDatapoints(pipe.query, pipe.concepts);

  return async.mapValuesLimit(normalizedQuery.join, 10, (joinQuery: any, link: any, mcb: Function) => {
    const validateQuery: ValidateQueryModel = ddfQueryValidator.validateMongoQuery(joinQuery);

    if(!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }

    return entitiesRepository.findEntityPropertiesByQuery(joinQuery, (error: any, entities: any) => {
      return mcb(error, _.map(entities, constants.ORIGIN_ID));
    });
  }, (err: any, substituteJoinLinks: any) => {
    if (err) {
      return cb(err, pipe);
    }

    const promotedQuery = ddfql.substituteDatapointJoinLinks(normalizedQuery, substituteJoinLinks);
    const subDatapointQuery = promotedQuery.where;
    const validateQuery: ValidateQueryModel = ddfQueryValidator.validateMongoQuery(subDatapointQuery);

    if(!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }

    return queryDatapointsByDdfql(pipe, subDatapointQuery, (queryErr: any, externalContext: any) => {
      if (queryErr) {
        return cb(queryErr, externalContext);
      }

      console.timeEnd('get datapoints');
      if(queryErr) {
        return cb(queryErr);
      }
      logger.info(`${_.size(externalContext.datapoints)} items of datapoints were selected`);

      return cb(null, externalContext);
    });
  });
}

function queryDatapointsByDdfql(pipe: any, subDatapointQuery: any, cb: Function): Promise<any> {
  return DatapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findByQuery(subDatapointQuery, (error: any, datapoints: any) => {
      if (error) {
        return cb(error);
      }

      pipe.datapoints = datapoints;

      return cb(null, pipe);
    });
}

function getConcepts(pipe: any, cb: Function): void {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    header: [],
    where: {}
  };

  return conceptsService.getConcepts(_pipe, (err: any, result: any) => {
    pipe.concepts = result.concepts;

    return cb(err, pipe);
  });
}

function mapConcepts(pipe: any, cb: Function): void {
  if (_.isEmpty(pipe.headers)) {
    return cb(`You didn't select any column`);
  }
  const resolvedConceptGids = _.map(pipe.concepts, constants.GID);
  const missingHeaders = _.difference(pipe.select, resolvedConceptGids);
  const missingKeys = _.difference(pipe.domainGids, resolvedConceptGids);

  if (!_.isEmpty(missingHeaders)) {
    return cb(`You choose select column(s) '${_.join(missingHeaders, ', ')}' which aren't present in choosen dataset`);
  }

  if (!_.isEmpty(missingKeys)) {
    return cb(`Your choose key column(s) '${_.join(missingKeys, ', ')}' which aren't present in choosen dataset`);
  }

  pipe.measures = _.filter(pipe.concepts, [constants.CONCEPT_TYPE, constants.CONCEPT_TYPE_MEASURE]);
  pipe.resolvedDomainsAndSetGids = pipe.domainGids;

  return async.setImmediate(() => cb(null, pipe));
}
