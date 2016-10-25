'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const mongoose = require('mongoose');

const common = require('./../common');
const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const ddfImportProcess = require('../../ws.utils/ddf-import-process');

const translationsService = require('./../import-translations.service');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../../ws.repository/ddf/data-points/data-points.repository');
const datapointsUtils = require('../datapoints.utils');

const hi = require('highland');

module.exports = processDataPointsChanges;

function startDatapointsCreation(externalContext, done) {
  logger.info('start process of updating data points');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'allChanges',
    'concepts',
    'previousConcepts',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset',
  ]));

  const errors = [];
  createDatapoints(externalContextFrozen)
    .stopOnError(error => {
      errors.push(error);
    })
    .done(() => {
      if (!_.isEmpty(errors)) {
        return done(errors, externalContext);
      }
      return done(null, externalContext);
    });
}

function findAllEntities(externalContext) {
  return entitiesRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAll()
    .then(datapointsUtils.segregateEntities);
}

function findAllPreviousEntities(externalContext) {
  return entitiesRepositoryFactory.previousVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAll()
    .then(datapointsUtils.segregateEntities);
}


function createDatapoints(externalContextFrozen) {
  const findAllEntitiesMemoized = _.memoize(findAllEntities);
  const findAllPreviousEntitiesMemoized = _.memoize(findAllPreviousEntities);

  return hi(_.keys(externalContextFrozen.allChanges))
    .filter(filename => filename.match(/ddf--datapoints--/g))
    .map(filename => ({filename, fileChanges: externalContextFrozen.allChanges[filename]}))
    .flatMap(({filename, fileChanges}) => {
      const {measures, dimensions} = datapointsUtils.parseFilename(filename, externalContextFrozen);
      return hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(segregatedEntities => ({filename, measures, dimensions, fileChanges, segregatedEntities}))
        .flatMap(context => {
          return hi(findAllPreviousEntitiesMemoized(externalContextFrozen))
            .map(segregatedPreviousEntities => _.extend(context, {segregatedPreviousEntities}, externalContextFrozen));
        });
    })
    .map(hi.wrapCallback(__closeRemovedAndUpdatedDataPoints));
}


function _processDataPointFile(pipe) {
  let key = 1;
  return (fileChanges, filename, cb) => async.waterfall([
    __closeRemovedAndUpdatedDataPoints,
    __fakeLoadRawDataPoints,
    __wrapProcessRawDataPoints,
    common.createEntitiesBasedOnDataPoints,
    __getAllEntities,
    common._createDataPoints,
  ], err => {
    logger.info(`** Processed ${key++} of ${_.keys(pipe.datapointsFiles).length} files`);

    return cb(err);
  });
}


function __closeRemovedAndUpdatedDataPoints(pipe, done) {
  logger.info(`** close data points`);

  pipe.closedDataPoints = {};

  return async.parallel([
    ___updateRemovedDataPoints(pipe.fileChanges.remove, pipe),
    ___updateChangedDataPoints(pipe.fileChanges.update, pipe),
    ___updateChangedDataPoints(pipe.fileChanges.change, pipe)
  ], (err) => {
    return done(err, pipe);
  });
}

function ___updateRemovedDataPoints(removedDataPoints, pipe) {
  return (cb) => {
    return async.eachLimit(
      removedDataPoints,
      constants.LIMIT_NUMBER_PROCESS,
      ____closeDataPoint(pipe),
      (err) => {
        return cb(err);
      });
  };
}

function ____closeDataPoint(pipe) {
  let groupedPreviousEntities = _.groupBy(pipe.previousEntities, 'gid');
  let groupedEntities = _.groupBy(pipe.entities, 'gid');

  return (datapoint, ecb) => {
    let entityGids = _.chain(datapoint)
      .pick(_.keys(pipe.dimensions))
      .values()
      .compact()
      .value();

    let entities = _.flatMap(entityGids, (gid) => {
      return groupedEntities[gid] || groupedPreviousEntities[gid];
    });

    return async.eachLimit(
      pipe.measures,
      constants.LIMIT_NUMBER_PROCESS,
      _____updateDataPoint(pipe, entities, datapoint),
      (err) => {
        return ecb(err);
      }
    );
  };
}

function _____updateDataPoint(pipe, entities, datapoint) {
  return (measure, ecb) => {

    const options = {
      measureOriginId: measure.originId,
      dimensionsSize: _.size(pipe.dimensions),
      dimensionsEntityOriginIds: _.map(entities, 'originId'),
      datapointValue: datapoint[measure.gid]
    };

    return datapointsRepositoryFactory.latestExceptCurrentVersion(pipe.dataset._id, pipe.transaction.createdAt)
      .closeDatapointByMeasureAndDimensionsAndValue(options, (err, doc) => {
        if (doc) {
          let complexKey = getComplexKey(datapoint);

          pipe.closedDataPoints[complexKey] = doc;
        }

        return ecb(err, pipe);
      });
  };
}

function ___updateChangedDataPoints(changedDataPoints, pipe) {
  return (cb) => {
    return async.mapLimit(
      _.map(changedDataPoints, 'data-origin'),
      constants.LIMIT_NUMBER_PROCESS,
      ____closeDataPoint(pipe),
      cb
    );
  };
}

function __fakeLoadRawDataPoints(pipe, done) {
  let updatedDataPoints = _.map(pipe.fileChanges.update, ___formRawDataPoint(pipe));
  let changedDataPoints = _.map(pipe.fileChanges.change, ___formRawDataPoint(pipe));
  let fakeLoadedDatapoints = _.concat(pipe.fileChanges.create, updatedDataPoints, changedDataPoints);

  pipe.fakeLoadedDatapoints = fakeLoadedDatapoints;

  return async.setImmediate(() => done(null, pipe));
}

function ___formRawDataPoint(pipe) {
  return (datapoint) => {
    let complexKey = getComplexKey(datapoint['data-origin']);
    let closedOriginDatapoint = pipe.closedDataPoints[complexKey];
    let originId = closedOriginDatapoint ? closedOriginDatapoint.originId : null;
    return _.defaults({originId}, datapoint['data-update'], datapoint['data-origin']);
  };
}

function __wrapProcessRawDataPoints(pipe, done) {
  return common.processRawDataPoints(pipe, done)(null, pipe.fakeLoadedDatapoints);
}

// UTILS FUNCTIONS
function getComplexKey(obj) {
  return _.chain(obj)
    .keys()
    .sort()
    .map(key => `${key}:${obj[key]}`)
    .join('--')
    .value();
}
