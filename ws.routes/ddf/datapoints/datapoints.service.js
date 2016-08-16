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
  const pipe = {
    select: options.select,
    headers: options.headers,
    domainGids: options.domainGids,
    where: options.where,
    sort: options.sort,
    groupBy: options.groupBy,
    datasetName: options.datasetName,
    version: options.version
  };

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

  const originalSubDatapointQuery = pipe.where.$or;
  const dimensionIds = pipe.entityOriginIdsGroupedByDomain;
  const conceptsByGids = _.keyBy(pipe.concepts, 'gid');
  const subDatapointQuery = {
    $or: _.map(originalSubDatapointQuery, (subquery) => {
      const wrappedSubquery = _.reduce(subquery, (result, q, k) => {
        result['value'] = q;
        result['measure'] = conceptsByGids[k].originId;

        return result;
      }, {});

      return wrappedSubquery;
    })
  };

  return datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findForGivenMeasuresAndDimensions(subDatapointQuery, dimensionIds, (error, datapoints) => {
      console.timeEnd('get datapoints');
      if (error) {
        return cb(error);
      }
      pipe.datapoints = datapoints;
      return cb(null, pipe);
    });
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
  const subDatapointQuery = {measure: {$in: measureIds}};

  return datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findForGivenMeasuresAndDimensions(subDatapointQuery, dimensionIds, (error, datapoints) => {
      console.timeEnd('get datapoints');
      if (error) {
        return cb(error);
      }
      //pipe.datapoints = datapoints.slice(0, 10);
      pipe.datapoints = datapoints;
      return cb(null, pipe);
    });
}
