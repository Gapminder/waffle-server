'use strict';
const _ = require('lodash');
const async = require('async');
const through2 = require('through2');

const constants = require('../../../ws.utils/constants');
const commonService = require('../../../ws.services/common.service');
const conceptsService = require('../concepts/concepts.service');
const entitiesService = require('../entities/entities.service');

const datapointsRepositoryFactory = require('../../../ws.repository/ddf/data-points/data-points.repository');

module.exports = {
  getConcepts,
  getEntities,
  mapConcepts,
  getDataPoints,
  collectDatapoints,
  matchDdfqlToDatapoints
};

function matchDdfqlToDatapoints(options, onMatchedDatapoints) {
  console.time('finish matching DataPoints');
  const pipe = options;

  return async.waterfall([
    async.constant(pipe),
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    mapConcepts,
    getEntities,
    getDdfqlDataPoints
  ], (error, result) => {
    console.timeEnd('finish matching DataPoints');

    return onMatchedDatapoints(error, result);
  });
}

function getDdfqlDataPoints(pipe, cb) {
  console.time('get datapoints');

  if (_.isEmpty(pipe.measures)) {
    console.error('Measure should present in select property');
    return cb(null, pipe);
  }

  const measureIds = _.map(pipe.measures, 'originId');
  const dimensionIds = pipe.entityOriginIdsGroupedByDomain;

  const stream =  datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findForGivenMeasuresAndDimensions(measureIds, dimensionIds);

  const entitiesByOriginId = _.keyBy(pipe.entities, 'originId');
  const conceptsByOriginId = _.keyBy(pipe.concepts, 'originId');

  const transformer = through2.obj(function (data, enc, callback) {
    console.timeEnd('get datapoints');

    data.dimensions = _.chain(entitiesByOriginId)
      .pick(data.dimensions)
      .mapValues((entity) => {
        entity.domain = conceptsByOriginId[entity.domain];
        entity.sets = _.map(entity.sets, set => conceptsByOriginId[set]);

        return entity;
      })
      .values()
      .value();
    data.measure = conceptsByOriginId[data.measure];

    this.push(data);

    callback();
  });

  const Mingo = require('mingo');
  const query = new Mingo.Query({
    "$and": [
      {
        dimensions: {
          "$and":[
            {
              "$elemMatch": {
                "domain.gid": "geo",
                "properties.is--country": true,
                "properties.latitude": {
                  "$gte": 0
                }
              }
            },
            // {
            //   "$elemMatch": {
            //     "domain.gid": "year",
            //     "gid": {
            //       "$gt": "2015"
            //     }
            //   }
            // }
          ]
        }
      },
      // {
      //   "$or":[
      //     {
      //       "measure.gid": "population_total",
      //       "value": {
      //         "$gt": 179942846
      //       }
      //     },
      //     {
      //       "measure.gid": "life_expectancy_years",
      //       "$or": [
      //         {
      //           "value": {
      //             "$lt": 50
      //           }
      //         },
      //         {
      //           "value": {
      //             "$gt": 40
      //           }
      //         }
      //       ]
      //     }
      //   ]
      // }
    ]
  });
  const qs = query.stream();
  let datapoints = [];

  console.time('filter datapoints');

  qs.on('data', (data) => {
    datapoints.push(data);
  });

  qs.on('finish', () => {
    console.timeEnd('filter datapoints');
    pipe.datapoints = datapoints;
    return cb(null, pipe);
  });

  qs.on('error', cb);

  stream.pipe(transformer).pipe(qs);
}

function collectDatapoints(options, onCollectDatapoints) {
  console.time('finish DataPoint stats');
  const pipe = options;

  return async.waterfall([
    async.constant(pipe),
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    mapConcepts,
    getEntities,
    getDataPoints
  ], (error, result) => {
    console.timeEnd('finish DataPoint stats');

    return onCollectDatapoints(error, result);
  });
}

function getConcepts(pipe, cb) {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    header: [],
    where: {}
  };

  return conceptsService.getConcepts(_pipe, (err, result) => {
    pipe.concepts = result.concepts;

    return cb(err, pipe);
  });
}

function mapConcepts(pipe, cb) {
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

function getEntities(pipe, cb) {
  return async.map(pipe.resolvedDomainsAndSetGids, _getEntitiesByDomainOrSetGid, (err, result) => {
    pipe.entityOriginIdsGroupedByDomain = _.mapValues(result, (value) => _.map(value, constants.ORIGIN_ID));
    pipe.entities = _.flatMap(result);

    return cb(err, pipe);
  });

  function _getEntitiesByDomainOrSetGid(domainGid, mcb) {
    const where = _.pickBy(pipe.where, (values, key) => _.startsWith(key, domainGid + '.') || key === domainGid);
    const _pipe = {
      dataset: pipe.dataset,
      version: pipe.version,
      domainGid: domainGid,
      headers: [],
      where: where
    };

    return entitiesService.getEntities(_pipe, (err, result) => mcb(err, result.entities));
  }
}

function getDataPoints(pipe, cb) {
  console.time('get datapoints');

  if (_.isEmpty(pipe.measures)) {
    console.error('Measure should present in select property');
    return cb(null, pipe);
  }

  const measureIds = _.map(pipe.measures, 'originId');
  const dimensionIds = pipe.entityOriginIdsGroupedByDomain;

  return datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findForGivenMeasuresAndDimensions(measureIds, dimensionIds, (error, datapoints) => {
      console.timeEnd('get datapoints');
      if (error) {
        return cb(error);
      }
      //pipe.datapoints = datapoints.slice(0, 10);
      pipe.datapoints = datapoints;
      return cb(null, pipe);
    });
}
