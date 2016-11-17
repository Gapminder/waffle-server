'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const path = require('path');
const async = require('async');
const byline = require('byline');
const JSONStream = require('JSONStream');

const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const datapointsUtils = require('../datapoints.utils');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../../ws.repository/ddf/data-points/data-points.repository');

const UPDATE_ACTIONS = new Set(['change', 'update']);

module.exports = startDatapointsCreation;

function startDatapointsCreation(externalContext, done) {
  logger.info('Start process of datapoints update');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDatasetDiff',
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
  return entitiesRepositoryFactory
    .previousVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
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

  const fileWithChangesStream = fs.createReadStream(externalContextFrozen.pathToDatasetDiff, {encoding: 'utf8'});

  const changesByLine = byline(fileWithChangesStream).pipe(JSONStream.parse());

  const datapointsChangesWithContextStream = hi(changesByLine)
    .filter(change => _.get(change, 'metadata.type') === constants.DATAPOINTS)
    .flatMap(datapointChanges => {
      const allEntitiesPromise = findAllEntitiesMemoized(externalContextFrozen);
      const allPreviousEntitiesPromise = findAllPreviousEntitiesMemoized(externalContextFrozen);

      return enrichDatapointChangesWithContextStream(
        datapointChanges,
        allEntitiesPromise,
        allPreviousEntitiesPromise,
        externalContextFrozen
      );
    });

  const datapointsWithFoundEntitiesStream = hi([
    toRemovedDatapointsStream(datapointsChangesWithContextStream),
    toCreatedDatapointsStream(datapointsChangesWithContextStream),
    toUpdatedDatapointsStream(datapointsChangesWithContextStream)
  ]).parallel(3);

  return saveDatapointsAndEntitiesFoundInThem(datapointsWithFoundEntitiesStream);
}

function enrichDatapointChangesWithContextStream(datapointChanges, allEntitiesPromise, allPreviousEntitiesPromise, externalContext) {
  const segregatedEntitiesPromise = allEntitiesPromise
    .then(segregatedEntities => ({segregatedEntities}));

  const segregatedPreviousEntitiesPromise = allPreviousEntitiesPromise
    .then(segregatedPreviousEntities => ({segregatedPreviousEntities}));

  const previousAndCurrentSegregatedEntitiesPromise =
    Promise.all([segregatedEntitiesPromise, segregatedPreviousEntitiesPromise])
    .then(result => _.extend({}, _.first(result), _.last(result)));

  return hi(previousAndCurrentSegregatedEntitiesPromise)
    .map(previousAndCurrentSegregatedEntities => {
    const context = _.extend(
      {filename: _.get(datapointChanges, 'metadata.file.new.path')},
      externalContext,
      previousAndCurrentSegregatedEntities
    );

    return { datapointChanges, context };
  });
}

function toRemovedDatapointsStream(datapointsChangesWithContextStream) {
  return datapointsChangesWithContextStream.fork()
    .filter(({datapointChanges}) => getAction(datapointChanges.metadata) === 'remove')
    .map(({datapointChanges, context}) => {
      const {measures, dimensions} = parseFilename(datapointChanges.metadata.file.old, context);

      return {datapointChanges, context: _.extend({}, context, {measures, dimensions})};
    })
    .batch(datapointsUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(context => {
      return hi.wrapCallback(closeRemovedDatapoints)(context);
    });
}

function toCreatedDatapointsStream(datapointsChangesWithContextStream) {
  return datapointsChangesWithContextStream.fork()
    .filter(({datapointChanges}) => getAction(datapointChanges.metadata) === 'create')
    .map(({datapointChanges, context}) => {
      const {measures, dimensions} = parseFilename(datapointChanges.metadata.file.new, context);

      return {datapointChanges, context: _.extend({}, context, {measures, dimensions})};
    })
    .map(({datapointChanges, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapointChanges.object, context, context);

      return {datapoint: datapointChanges.object, entitiesFoundInDatapoint, context};
    });
}

function toUpdatedDatapointsStream(datapointsChangesWithContextStream) {
  return datapointsChangesWithContextStream.fork()
    .filter(({datapointChanges}) => UPDATE_ACTIONS.has(getAction(datapointChanges.metadata)))
    .map(({datapointChanges, context}) => {
      const {measures, dimensions} = parseFilename(datapointChanges.metadata.file.new, context);
      const {measures: measuresOld, dimensions: dimensionsOld} = parseFilename(datapointChanges.metadata.file.old, context);

      return {datapointChanges, context: _.extend({}, context, {measures, measuresOld, dimensions, dimensionsOld})};
    })
    .map(({datapointChanges, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapointChanges.object['data-update'], context, context);

      return {datapointChanges, entitiesFoundInDatapoint, context};
    })
    .batch(datapointsUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(datapointsEntitiesAndContext => {
      return hi.wrapCallback(closeDatapointsOfPreviousVersion)(datapointsEntitiesAndContext);
    })
    .flatMap(datapointsAndFoundEntitiesAndContext => hi(datapointsAndFoundEntitiesAndContext));
}

//FIXME: should be the same for datapoints importing once it's done via datapackage.json
function parseFilename(file, externalContext) {
  const {
    name: resourceName,
    schema: {
      fields: resourceFields,
      primaryKey: resourcePrimaryKey
    }
  } = file;

  logger.debug('Processing resource with name: ', resourceName);

  const measureGids = _.map(_.filter(resourceFields, field => !_.includes(resourcePrimaryKey, field.name)), 'name');
  const dimensionGids = resourcePrimaryKey;

  const measures = _.merge(_.pick(externalContext.previousConcepts, measureGids), _.pick(externalContext.concepts, measureGids));
  const dimensions = _.merge(_.pick(externalContext.previousConcepts, dimensionGids), _.pick(externalContext.concepts, dimensionGids));

  if (_.isEmpty(measures)) {
    throw Error(`Resource '${resourceName}' doesn't have any measure.`);
  }

  if (_.isEmpty(dimensions)) {
    throw Error(`Resource '${resourceName}' doesn't have any dimensions.`);
  }

  logger.debug(`** parsed measures: ${_.keys(measures)}`, `** parsed dimensions: ${_.keys(dimensions)}`);

  return {measures, dimensions};
}

function closeRemovedDatapoints(removedDataPoints, onAllRemovedDatapointsClosed) {
  logger.info('Closing removed datapoints');

  return async.eachLimit(removedDataPoints, constants.LIMIT_NUMBER_PROCESS,
    ({datapointChanges, context: externalContext}, onDatapointsForGivenMeasuresClosed) => {
      const originalRawDatapoint = datapointChanges.object;

      const context = {
        dimensions: externalContext.dimensions,
        segregatedEntities: externalContext.segregatedEntities,
        segregatedPreviousEntities: externalContext.segregatedPreviousEntities,
        measures: externalContext.measures,
        datasetId: externalContext.dataset._id,
        version: externalContext.transaction.createdAt
      };

      return closeDatapointsPerMeasure(originalRawDatapoint, context, onDatapointsForGivenMeasuresClosed);
  }, onAllRemovedDatapointsClosed);
}

function closeDatapointsOfPreviousVersion(changedDataPoints, onDatapointsOfPreviousVersionClosed) {
  logger.info('Closing updated datapoints');
  return async.mapLimit(changedDataPoints, constants.LIMIT_NUMBER_PROCESS,
    ({datapointChanges, entitiesFoundInDatapoint, context: externalContext}, onDatapointsForGivenMeasuresClosed) => {
      const originalRawDatapoint = _.get(datapointChanges.object, 'data-origin');

      const makeDatapointBasedOnItsClosedVersion = closedDatapoint => {
        logger.debug('Create new datapoint based on closed one. OriginId: ', closedDatapoint.originId);

        const newRawDatapoint = _.get(datapointChanges.object, 'data-update');
        const datapointToCreate = _.defaults({originId: closedDatapoint.originId}, newRawDatapoint, originalRawDatapoint);
        return {datapoint: datapointToCreate, entitiesFoundInDatapoint, context: externalContext};
      };

      const context = {
        dimensions: externalContext.dimensionsOld,
        segregatedEntities: externalContext.segregatedEntities,
        segregatedPreviousEntities: externalContext.segregatedPreviousEntities,
        measures: externalContext.measuresOld,
        datasetId: externalContext.dataset._id,
        version: externalContext.transaction.createdAt,
        handleClosedDatapoint: makeDatapointBasedOnItsClosedVersion
      };

      return closeDatapointsPerMeasure(originalRawDatapoint, context, onDatapointsForGivenMeasuresClosed);
  }, (error, datapointsToCreate) => {
    return onDatapointsOfPreviousVersionClosed(error, _.flatten(datapointsToCreate));
  });
}

function closeDatapointsPerMeasure(rawDatapoint, externalContext, onDatapointsForGivenMeasuresClosed) {
  const dimensionsEntityOriginIds = getDimensionsAsEntityOriginIds(rawDatapoint, {
    dimensions: externalContext.dimensions,
    segregatedEntities: externalContext.segregatedEntities,
    segregatedPreviousEntities: externalContext.segregatedPreviousEntities,
  });

  return async.mapLimit(externalContext.measures, constants.LIMIT_NUMBER_PROCESS, (measure, onDatapointClosed) => {
      logger.debug('Closing datapoint for measure', measure.gid, measure.originId);

      const options = {
        measureOriginId: measure.originId,
        dimensionsSize: _.size(externalContext.dimensions),
        dimensionsEntityOriginIds,
        datapointValue: rawDatapoint[measure.gid]
      };

      return datapointsRepositoryFactory.latestExceptCurrentVersion(externalContext.datasetId, externalContext.version)
        .closeDatapointByMeasureAndDimensionsAndValue(options, (error, closedDatapoint) => {
          if (error) {
            return onDatapointClosed(error);
          }

          if (!closedDatapoint) {
            logger.error('Datapoint that should be closed was not found by given params: ', options);
          }

          const {handleClosedDatapoint = _.noop} = externalContext;

          return onDatapointClosed(error, handleClosedDatapoint(closedDatapoint));
        });
  }, (error, datapointsToCreate) => {
    return onDatapointsForGivenMeasuresClosed(error, _.values(datapointsToCreate));
  });
}

function getDimensionsAsEntityOriginIds(datapoint, externalContext) {
  const entityGids = _.chain(datapoint)
    .pick(_.keys(externalContext.dimensions))
    .values()
    .compact()
    .value();

  return _.flatMap(entityGids, (gid) => {
    const entities = externalContext.segregatedEntities.groupedByGid[gid] || externalContext.segregatedPreviousEntities.groupedByGid[gid];
    return _.map(entities, 'originId');
  });
}

function getAction(metadata) {
  return _.get(metadata, 'action');
}
