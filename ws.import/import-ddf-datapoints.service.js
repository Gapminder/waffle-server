'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Converter = require('csvtojson').Converter;

const mongoose = require('mongoose');
const constants = require('../ws.utils/constants');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');

const common = require('./common');
const mappers = require('./incremental/mappers');
const logger = require('../ws.config/log');
const config = require('../ws.config/config');

const hi = require('highland');

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
    return Promise.all(_.map(datapointsByFilename, datapoints => {
      datapoints.context.entities.foundInDatapointsByGid = entitiesFoundInDatapointsByGid;
      return mapAndStoreDatapointsToDb(datapoints, externalContextFrozen);
    }));
  };
}
function createDatapoints(externalContextFrozen) {
  const findAllEntitiesMemoized = _.memoize(findAllEntities);
  const saveEntitiesFoundInDatapoints = createEntitiesFoundInDatapointsSaverWithCache();

  return hi.wrapCallback(fs.readdir)(externalContextFrozen.pathToDdfFolder)
    .flatMap(filenames => hi(filenames))
    .filter(filename => /^ddf--datapoints--/.test(filename))
    .map(filename => {
      const {measures, dimensions} = parseFilename(filename, externalContextFrozen);
      return {filename, measures, dimensions};
    })
    .flatMap(context => {
      return hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(entities => _.extend(context, {entities}));
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
      const datapointsByFilename = _.chain(datapointsBatch)
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

      return hi(
        saveEntitiesFoundInDatapoints(_.flatten(_.map(datapointsBatch, 'entitiesFoundInDatapoint')))
          .then(saveDatapoints(datapointsByFilename, externalContextFrozen))
      );
    });
}

function findAllEntities(externalContext) {
  logger.info('** find all entities');
  return entitiesRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAll()
    .then(entities => {
    return _.reduce(entities, (result, entity) => {
      if (_.isEmpty(entity.sets)) {
        const domain = entity.domain;
        const keyDomain = _.get(domain, 'originId', domain);
        result.byDomain[`${entity.gid}-${keyDomain}`] = entity;
      } else {
        const set = _.head(entity.sets);
        const keySet = _.get(set, 'originId', set);
        result.bySet[`${entity.gid}-${keySet}`] = entity;
      }

      result.byGid[entity.gid] = entity;
      return result;
    }, {bySet: {}, byDomain: {}, byGid: {}});
  });
}

function parseFilename(filename, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const parseFilename = common.getMeasureDimensionFromFilename(filename);
  const measureGids = parseFilename.measures;
  const dimensionGids = parseFilename.dimensions;

  //TODO: Previous concepts? Incremental update?
  const measures = _.merge(_.pick(externalContext.previousConcepts, measureGids), _.pick(externalContext.concepts, measureGids));
  const dimensions = _.merge(_.pick(externalContext.previousConcepts, dimensionGids), _.pick(externalContext.concepts, dimensionGids));

  if (_.isEmpty(measures)) {
    throw Error(`file '${filename}' doesn't have any measure.`);
  }

  if (_.isEmpty(dimensions)) {
    throw Error(`file '${filename}' doesn't have any dimensions.`);
  }

  logger.info(`** parsed measures: ${_.keys(measures)}`);
  logger.info(`** parsed dimensions: ${_.keys(dimensions)}`);

  return {measures, dimensions};
}

function findEntitiesInDatapoint(datapoint, context, externalContext) {
  const dictionary = context.entities.byGid;
  const gids = new Set();
  const entitiesFoundInDatapoint = [];

  _.each(context.dimensions, (concept) => {
    const domain = concept.domain || concept;

    if (!dictionary[datapoint[concept.gid]] && !gids.has(datapoint[concept.gid])) {
      const entityFoundInDatapoint = mappers.mapDdfInDatapointsFoundEntityToWsModel(datapoint, concept, domain, context, externalContext);
      entitiesFoundInDatapoint.push(entityFoundInDatapoint);
      gids.add(datapoint[concept.gid]);
    }
  });

  return entitiesFoundInDatapoint;
}

function storeEntitiesToDb(entities) {
  if (_.isEmpty(entities)) {
    return Promise.resolve([]);
  }

  logger.info(`** create entities based on data points`);
  return mongoose.model('Entities').create(entities);
}

function mapAndStoreDatapointsToDb(datapoints, externalContext) {
  logger.info(`** create data points`);
  const datapointMapper = mappers.mapDdfDataPointToWsModel(_.extend({
    measures: datapoints.measures,
    filename: datapoints.filename,
    dimensions: datapoints.dimensions,
    entities: datapoints.context.entities
  }, externalContext));

  const wsDatapoints = _.flatMap(datapoints.datapoints, datapoint => {
    return datapointMapper(datapoint.datapoint);
  });

  return  mongoose.model('DataPoints').create(wsDatapoints);
}

function readCsvFile(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8').pipe(new Converter({constructResult: false}, {objectMode: true})));
}
