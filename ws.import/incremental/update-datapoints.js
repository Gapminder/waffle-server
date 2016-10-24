'use strict';

const _ = require('lodash');
const async = require('async');

const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');

const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../../ws.repository/ddf/data-points/data-points.repository');
const datapointsUtils = require('../datapoints.utils');

const hi = require('highland');

module.exports = startDatapointsCreation;

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

function findAllPreviousEntities(externalContext) {
  return entitiesRepositoryFactory.previousVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAll()
    .then(datapointsUtils.segregateEntities);
}

function createDatapoints(externalContextFrozen) {
  const findAllEntitiesMemoized = _.memoize(datapointsUtils.findAllEntities);

  const findAllPreviousEntitiesMemoized = _.memoize(findAllPreviousEntities);

  const saveEntitiesFoundInDatapoints = datapointsUtils.createEntitiesFoundInDatapointsSaverWithCache();

  const saveDatapointsAndEntitiesFoundInThem = _.curry(datapointsUtils.saveDatapointsAndEntitiesFoundInThem)(
    saveEntitiesFoundInDatapoints,
    externalContextFrozen
  );

  const datapointsWithFoundEntitiesStream = hi(_.keys(externalContextFrozen.allChanges))
    .filter(filename => {
      return filename.match(/ddf--datapoints--/g);
    })
    .map(filename => {
      return {filename, fileChanges: externalContextFrozen.allChanges[filename].body};
    })
    .flatMap(({filename, fileChanges}) => {
      const {measures, dimensions} = datapointsUtils.parseFilename(filename, externalContextFrozen);

      const segregatedEntitiesStream = hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(segregatedEntities => ({segregatedEntities}));

      const segregatedPreviousEntitiesStream = hi(findAllPreviousEntitiesMemoized(externalContextFrozen))
        .map(segregatedPreviousEntities => ({segregatedPreviousEntities}));

      return hi([segregatedEntitiesStream, segregatedPreviousEntitiesStream])
        .sequence()
        .reduce([], (result, segregatedEntities) => {
          result.push(segregatedEntities);
          return result;
        })
        .map(previousAndCurrentSegregatedEntities => {
          return _.extend({filename, measures, dimensions, fileChanges}, ... [externalContextFrozen, ...previousAndCurrentSegregatedEntities]);
        });
    })
    .flatMap(context => {
      return hi.wrapCallback(__closeRemovedAndUpdatedDataPoints)(context);
    })
    .flatMap(context => {
      const toRawDatapoint = _.curry(formRawDataPoint)(context);
      const updatedDataPoints = _.map(context.fileChanges.update, toRawDatapoint);
      const changedDataPoints = _.map(context.fileChanges.change, toRawDatapoint);
      return hi(_.concat(context.fileChanges.create, updatedDataPoints, changedDataPoints))
        .map(datapoint => {
          const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapoint, context, externalContextFrozen);
          return {datapoint, entitiesFoundInDatapoint, context};
        });
    });

  return saveDatapointsAndEntitiesFoundInThem(datapointsWithFoundEntitiesStream);
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

function formRawDataPoint(pipe, datapoint) {
  const complexKey = getComplexKey(datapoint['data-origin']);
  const closedOriginDatapoint = pipe.closedDataPoints[complexKey];
  const originId = closedOriginDatapoint ? closedOriginDatapoint.originId : null;
  return _.defaults({originId}, datapoint['data-update'], datapoint['data-origin']);
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

function ____closeDataPoint(pipe) {
  return (datapoint, ecb) => {
    let entityGids = _.chain(datapoint)
      .pick(_.keys(pipe.dimensions))
      .values()
      .compact()
      .value();

    let entities = _.flatMap(entityGids, (gid) => {
      return pipe.segregatedEntities.groupedByGid[gid] || pipe.segregatedPreviousEntities.groupedByGid[gid];
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
      datapointValue: datapoint[measure.gid],
      languages: _.get(datapoint, 'languages', null)
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

function getComplexKey(obj) {
  return _.chain(obj)
    .keys()
    .sort()
    .map(key => `${key}:${obj[key]}`)
    .join('--')
    .value();
}
