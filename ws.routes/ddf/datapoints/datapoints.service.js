'use strict';
const _ = require('lodash');
const async = require('async');
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
  collectDatapoints
};

function collectDatapoints(options, cb) {
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

    return cb(error, result);
  });
}

function getConcepts(pipe, cb) {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    header: [],
    where: {
      concept: pipe.headers
    }
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

  const missingHeaders = _.difference(pipe.headers, _.map(pipe.concepts, constants.GID));
  const missingKeys = _.difference(pipe.domainGids, _.map(pipe.concepts, constants.GID));

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
      pipe.datapoints = datapoints;
      return cb(null, pipe);
    });
}
