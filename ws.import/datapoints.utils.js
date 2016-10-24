'use strict';

const _ = require('lodash');
const hi = require('highland');
const mongoose = require('mongoose');

const logger = require('../ws.config/log');
const mappers = require('./incremental/mappers');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');

const DEFAULT_CHUNK_SIZE = 1500;

module.exports = {
  parseFilename,
  segregateEntities,
  findEntitiesInDatapoint,
  findAllEntities,
  createEntitiesFoundInDatapointsSaverWithCache,
  getMeasureDimensionFromFilename,
  saveDatapointsAndEntitiesFoundInThem
};

function saveDatapointsAndEntitiesFoundInThem(saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) {
  return datapointsFoundEntitiesStream
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

function findAllEntities(externalContext) {
  return entitiesRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAll()
    .then(segregateEntities);
}

function parseFilename(filename, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const parseFilename = getMeasureDimensionFromFilename(filename);
  const measureGids = parseFilename.measures;
  const dimensionGids = parseFilename.dimensions;

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

function segregateEntities(entities) {
  //FIXME: Segregation is a workaround for issue related to having same gid in couple entity files
  return _.reduce(entities, (result, entity) => {
    if (_.isEmpty(entity.sets)) {
      const domain = entity.domain;
      result.byDomain[`${entity.gid}-${_.get(domain, 'originId', domain)}`] = entity;
    } else {
      const set = _.head(entity.sets);
      result.bySet[`${entity.gid}-${_.get(set, 'originId', set)}`] = entity;
    }

    result.byGid[entity.gid] = entity;

    result.groupedByGid[entity.gid] = result.groupedByGid[entity.gid] || [];
    result.groupedByGid[entity.gid].push(entity);
    return result;
  }, {bySet: {}, byDomain: {}, byGid: {}, groupedByGid: {}});
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

function storeEntitiesToDb(entities) {
  if (_.isEmpty(entities)) {
    return Promise.resolve([]);
  }

  logger.info(`** create entities based on data points`);
  return mongoose.model('Entities').create(entities);
}

function saveDatapoints(datapointsByFilename, externalContextFrozen) {
  return entitiesFoundInDatapointsByGid => {
    return Promise.all(_.map(datapointsByFilename, datapointsFromSameFile => {
      datapointsFromSameFile.context.segregatedEntities.foundInDatapointsByGid = entitiesFoundInDatapointsByGid;
      return mapAndStoreDatapointsToDb(datapointsFromSameFile, externalContextFrozen);
    }));
  };
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

function getMeasureDimensionFromFilename(filename) {
  let parsedFileName = filename.replace(/^ddf--datapoints--|\.csv$/g, '').split('--by--');
  return {
    measures: _.first(parsedFileName).split('--'),
    dimensions: _.chain(parsedFileName)
      .last()
      .split('--')
      .map(dimension => _.first(dimension.split('-')))
      .value()
  };
}
