import * as _ from 'lodash';
import * as hi from 'highland';
import * as path from 'path';
import * as async from 'async';
import { logger } from '../../ws.config/log';
import { constants } from '../../ws.utils/constants';
import * as fileUtils from '../../ws.utils/file';
import * as ddfImportUtils from '../utils/import-ddf.utils';
import * as datapointsUtils from '../utils/datapoints.utils';
import { ChangesDescriptor } from '../utils/changes-descriptor';
import { DatapointsRepositoryFactory } from '../../ws.repository/ddf/data-points/data-points.repository';

export {
  startDatapointsCreation as updateDatapoints
};

function startDatapointsCreation(externalContext, done) {
  logger.info('Start process of datapoints update');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDatasetDiff',
    'previousConcepts',
    'concepts',
    'timeConcepts',
    'transaction',
    'previousTransaction',
    'dataset',
  ]));

  const datapointsUpdateStream = updateDatapoints(externalContextFrozen);
  ddfImportUtils.startStreamProcessing(datapointsUpdateStream, externalContext, done);
}

function updateDatapoints(externalContextFrozen) {
  const findAllEntitiesMemoized = _.memoize(datapointsUtils.findAllEntities);
  const findAllPreviousEntitiesMemoized = _.memoize(datapointsUtils.findAllPreviousEntities);
  const saveEntitiesFoundInDatapoints = datapointsUtils.createEntitiesFoundInDatapointsSaverWithCache();

  const saveDatapointsAndEntitiesFoundInThem = _.curry(datapointsUtils.saveDatapointsAndEntitiesFoundInThem)(
    saveEntitiesFoundInDatapoints,
    externalContextFrozen
  );

  const datapointsChangesWithContextStream =
    fileUtils.readTextFileByLineAsJsonStream(externalContextFrozen.pathToDatasetDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.DATAPOINTS))
    .flatMap(changesDescriptor => {
      const allEntitiesPromise = findAllEntitiesMemoized(externalContextFrozen);
      const allPreviousEntitiesPromise = findAllPreviousEntitiesMemoized(externalContextFrozen);

      return enrichDatapointChangesWithContextStream(
        changesDescriptor,
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

function enrichDatapointChangesWithContextStream(changesDescriptor, allEntitiesPromise, allPreviousEntitiesPromise, externalContext) {
  const segregatedEntitiesPromise = allEntitiesPromise
    .then(segregatedEntities => ({segregatedEntities}));

  const segregatedPreviousEntitiesPromise = allPreviousEntitiesPromise
    .then(segregatedPreviousEntities => ({segregatedPreviousEntities}));

  const previousAndCurrentSegregatedEntitiesPromise =
    Promise.all([segregatedEntitiesPromise, segregatedPreviousEntitiesPromise])
    .then(result => _.extend({}, _.first(result), _.last(result)));

  return hi(previousAndCurrentSegregatedEntitiesPromise)
    .map(previousAndCurrentSegregatedEntities => {

      const resource =
        changesDescriptor.isRemoveAction()
        ? changesDescriptor.oldResource
        : changesDescriptor.currentResource;

      const context = _.extend({filename: _.get(resource, 'path')}, externalContext, previousAndCurrentSegregatedEntities);
      return {changesDescriptor, context};
    });
}

function toRemovedDatapointsStream(datapointsChangesWithContextStream) {
  return datapointsChangesWithContextStream.fork()
    .filter(({changesDescriptor}) => changesDescriptor.isRemoveAction())
    .map(({changesDescriptor, context}) => {
      const {measures, dimensions} = datapointsUtils.getDimensionsAndMeasures(changesDescriptor.oldResource, context);
      return {changesDescriptor, context: _.extend({}, context, {measures, dimensions})};
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(context => {
      return hi.wrapCallback(closeRemovedDatapoints)(context);
    });
}

function toCreatedDatapointsStream(datapointsChangesWithContextStream) {
  return datapointsChangesWithContextStream.fork()
    .filter(({changesDescriptor}) => changesDescriptor.isCreateAction())
    .map(({changesDescriptor, context}) => {
      const {measures, dimensions} = datapointsUtils.getDimensionsAndMeasures(changesDescriptor.currentResource, context);

      return {changesDescriptor, context: _.extend({}, context, {measures, dimensions})};
    })
    .map(({changesDescriptor, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(changesDescriptor.changes, context, context);
      return {datapoint: changesDescriptor.changes, entitiesFoundInDatapoint, context};
    });
}

function toUpdatedDatapointsStream(datapointsChangesWithContextStream) {
  return datapointsChangesWithContextStream.fork()
    .filter(({changesDescriptor}) => changesDescriptor.isUpdateAction())
    .map(({changesDescriptor, context}) => {
      const {measures, dimensions} = datapointsUtils
        .getDimensionsAndMeasures(changesDescriptor.currentResource, context);

      const {measures: measuresOld, dimensions: dimensionsOld} = datapointsUtils
        .getDimensionsAndMeasures(changesDescriptor.oldResource, context);

      return {changesDescriptor, context: _.extend({}, context, {measures, measuresOld, dimensions, dimensionsOld})};
    })
    .map(({changesDescriptor, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(changesDescriptor.changes, context, context);

      return {changesDescriptor, entitiesFoundInDatapoint, context};
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(datapointsEntitiesAndContext => {
      return hi.wrapCallback(closeDatapointsOfPreviousVersion)(datapointsEntitiesAndContext);
    })
    .flatMap(datapointsAndFoundEntitiesAndContext => hi(datapointsAndFoundEntitiesAndContext));
}

function closeRemovedDatapoints(removedDataPoints, onAllRemovedDatapointsClosed) {
  logger.info('Closing removed datapoints');

  return async.eachLimit(removedDataPoints, constants.LIMIT_NUMBER_PROCESS,
    ({changesDescriptor, context: externalContext}, onDatapointsForGivenMeasuresClosed) => {
      const context = {
        dimensions: externalContext.dimensions,
        segregatedEntities: externalContext.segregatedEntities,
        segregatedPreviousEntities: externalContext.segregatedPreviousEntities,
        measures: externalContext.measures,
        datasetId: externalContext.dataset._id,
        version: externalContext.transaction.createdAt
      };

      return closeDatapointsPerMeasure(changesDescriptor.original, context, onDatapointsForGivenMeasuresClosed);
  }, onAllRemovedDatapointsClosed);
}

function closeDatapointsOfPreviousVersion(changedDataPoints, onDatapointsOfPreviousVersionClosed) {
  logger.info('Closing updated datapoints');
  return async.mapLimit(changedDataPoints, constants.LIMIT_NUMBER_PROCESS,
    ({changesDescriptor, entitiesFoundInDatapoint, context: externalContext}, onDatapointsForGivenMeasuresClosed) => {
      const makeDatapointBasedOnItsClosedVersion = (closedDatapoint, closingMeasure) => {
        logger.debug('Create new datapoint based on closed one. OriginId: ', closedDatapoint.originId);

        const newRawDatapoint = omitNotClosingMeasures({
          rawDatapoint: changesDescriptor.changes,
          measuresToOmit: externalContext.measures,
          measureToPreserve: closingMeasure
        });

        const datapointToCreate = _.defaults({originId: closedDatapoint.originId}, newRawDatapoint);
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

      return closeDatapointsPerMeasure(changesDescriptor.original, context, onDatapointsForGivenMeasuresClosed);
  }, (error, datapointsToCreate) => {
    return onDatapointsOfPreviousVersionClosed(error, _.flatten(datapointsToCreate));
  });
}

function closeDatapointsPerMeasure(rawDatapoint, externalContext, onDatapointsForGivenMeasuresClosed) {
  const dimensionsEntityOriginIds = datapointsUtils.getDimensionsAsEntityOriginIds(rawDatapoint, {
    dimensions: externalContext.dimensions,
    segregatedEntities: externalContext.segregatedEntities,
    segregatedPreviousEntities: externalContext.segregatedPreviousEntities,
  });

  return async.mapLimit(externalContext.measures, constants.LIMIT_NUMBER_PROCESS, (measure: any, onDatapointClosed: Function) => {
      logger.debug('Closing datapoint for measure', measure.gid, measure.originId);

      const options = {
        measureOriginId: measure.originId,
        dimensionsSize: _.size(externalContext.dimensions),
        dimensionsEntityOriginIds,
        datapointValue: rawDatapoint[measure.gid]
      };

      return DatapointsRepositoryFactory.latestExceptCurrentVersion(externalContext.datasetId, externalContext.version)
        .closeDatapointByMeasureAndDimensions(options, (error, closedDatapoint) => {
          if (error) {
            return onDatapointClosed(error);
          }

          if (!closedDatapoint) {
            logger.error('Datapoint that should be closed was not found by given params: ', options);
            return onDatapointClosed();
          }

          const {handleClosedDatapoint = _.noop} = externalContext;

          return onDatapointClosed(error, handleClosedDatapoint(closedDatapoint, measure));
        });
  }, (error, datapointsToCreate) => {
    return onDatapointsForGivenMeasuresClosed(error, _.values(datapointsToCreate));
  });
}

function omitNotClosingMeasures(options) {
  const notClosingMeasureGids = _.reduce(options.measuresToOmit, (result, measure: any) => {
    if (measure.gid !== options.measureToPreserve.gid) {
      result.push(measure.gid);
    }
    return result;
  }, []);

  return _.omit(options.rawDatapoint, notClosingMeasureGids);
}
