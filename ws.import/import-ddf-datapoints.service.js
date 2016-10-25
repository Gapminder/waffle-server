'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');

const Converter = require('csvtojson').Converter;
const mongoose = require('mongoose');

const common = require('./common');
const logger = require('../ws.config/log');
const mappers = require('./incremental/mappers');
const constants = require('../ws.utils/constants');
const datapointsUtils = require('./datapoints.utils');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');

const DEFAULT_CHUNK_SIZE = 1500;
const MONGODB_DOC_CREATION_THREADS_AMOUNT = 3;

module.exports = startDatapointsCreation;

function startDatapointsCreation(externalContext, done) {
  logger.info('start process creating data points');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset',
    'resolvePath'
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

function createDatapoints(externalContextFrozen) {
  const findAllEntitiesMemoized = _.memoize(findAllEntities);
  const saveEntitiesFoundInDatapoints = createEntitiesFoundInDatapointsSaverWithCache();

  return hi.wrapCallback(fs.readdir)(externalContextFrozen.pathToDdfFolder)
    .flatMap(filenames => hi(filenames))
    .filter(filename => /^ddf--datapoints--/.test(filename))
    .flatMap(filename => {
      const {measures, dimensions} = datapointsUtils.parseFilename(filename, externalContextFrozen);
      return hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(segregatedEntities => ({filename, measures, dimensions, segregatedEntities}));
    })
    .map(context => {
      return readCsvFile(externalContextFrozen.resolvePath(context.filename), {})
        .map(datapoint => ({datapoint, context}));
    })
    .parallel(MONGODB_DOC_CREATION_THREADS_AMOUNT)
    .map(({datapoint, context}) => {
      const entitiesFoundInDatapoint = findEntitiesInDatapoint(datapoint, context, externalContextFrozen);
      return {datapoint, entitiesFoundInDatapoint, context};
    })
    .batch(DEFAULT_CHUNK_SIZE)
    .flatMap(datapointsBatch => {
      const datapointsByFilename = groupDatapointsByFilename(datapointsBatch);
      const entitiesFoundInDatapoints = _.flatten(_.map(datapointsBatch, 'entitiesFoundInDatapoint'));

      return hi(
        saveEntitiesFoundInDatapoints(entitiesFoundInDatapoints)
          .then(saveDatapoints(datapointsByFilename, externalContextFrozen))
      );
    });
}

function createEntitiesFoundInDatapointsSaverWithCache() {
  const entitiesFoundInDatapointsCache = {};
  return (entities) => {
    const notSeenEntities = _.reduce(entities, (result, entity) => {
      if (!entitiesFoundInDatapointsCache[entity.gid]) {
        result.push(entity);
      }
      return result;
    }, []);

    if (_.isEmpty(notSeenEntities)) {
      return Promise.resolve(entitiesFoundInDatapointsCache);
    }

    return storeEntitiesToDb(notSeenEntities)
      .then(entityModels => {
        return _.reduce(_.map(entityModels, '_doc'), (cache, entity) => {
          cache[entity.gid] = entity;
          return cache;
        }, entitiesFoundInDatapointsCache);
      });
  };
}

function saveDatapoints(datapointsByFilename, externalContextFrozen) {
  return entitiesFoundInDatapointsByGid => {
    return Promise.all(_.map(datapointsByFilename, datapointsFromSameFile => {
      datapointsFromSameFile.context.segregatedEntities.foundInDatapointsByGid = entitiesFoundInDatapointsByGid;
      return mapAndStoreDatapointsToDb(datapointsFromSameFile, externalContextFrozen);
    }));
  };
}

function groupDatapointsByFilename(datapointsBatch) {
  return _.chain(datapointsBatch)
    .groupBy('context.filename')
    .mapValues((datapoints, filename) => {
      const anyDatapoint = _.head(datapoints);
      return {
        filename,
        datapoints,
        context: anyDatapoint.context,
        measures: _.get(anyDatapoint, 'context.measures'),
        dimensions: _.get(anyDatapoint, 'context.dimensions'),
      };
    })
    .value();
}

function findAllEntities(externalContext) {
  logger.info('** find all entities');
  return entitiesRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAll()
    .then(datapointsUtils.segregateEntities);
}

function findEntitiesInDatapoint(datapoint, context, externalContext) {
  const alreadyFoundEntitiyGids = new Set();

  return _.reduce(context.dimensions, (entitiesFoundInDatapoint, concept) => {
    const domain = concept.domain || concept;
    const entityGid = datapoint[concept.gid];
    const existedEntity = context.segregatedEntities.byGid[entityGid];
    const alreadyFoundEntity = alreadyFoundEntitiyGids.has(entityGid);

    if (!existedEntity && !alreadyFoundEntity) {
      const entityFoundInDatapoint = mappers.mapDdfInDatapointsFoundEntityToWsModel(
        datapoint,
        concept,
        domain,
        context,
        externalContext
      );

      alreadyFoundEntitiyGids.add(entityGid);
      entitiesFoundInDatapoint.push(entityFoundInDatapoint);
    }

    return entitiesFoundInDatapoint;
  }, []);
}

function storeEntitiesToDb(entities) {
  if (_.isEmpty(entities)) {
    return Promise.resolve([]);
  }

  logger.info(`** create entities based on data points`);
  return mongoose.model('Entities').create(entities);
}

function mapAndStoreDatapointsToDb(datapointsFromSameFile, externalContext) {
  logger.info(`** create data points`);

  const {measures, filename, dimensions, context: {segregatedEntities: entities}} = datapointsFromSameFile;

  const mappingContext = _.extend({
    measures,
    filename,
    dimensions,
    entities
  }, externalContext);

  const toWsDatapoint = mappers.mapDdfDataPointToWsModel(mappingContext);

  const wsDatapoints = _.flatMap(datapointsFromSameFile.datapoints, datapointWithContext => {
    return toWsDatapoint(datapointWithContext.datapoint);
  });

  return mongoose.model('DataPoints').create(wsDatapoints);
}

function readCsvFile(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}
