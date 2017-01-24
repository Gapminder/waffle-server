import * as _ from 'lodash';
import * as hi from 'highland';

import {MongooseDocument} from 'mongoose';
import {logger} from '../../ws.config/log';
import * as ddfMappers from './ddf-mappers';
import * as ddfImportUtils from './import-ddf.utils';
import {EntitiesRepositoryFactory} from '../../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../../ws.repository/ddf/data-points/data-points.repository';

export {
  getDimensionsAndMeasures,
  segregateEntities,
  findEntitiesInDatapoint,
  findAllEntities,
  findAllPreviousEntities,
  createEntitiesFoundInDatapointsSaverWithCache,
  saveDatapointsAndEntitiesFoundInThem,
  getDimensionsAsEntityOriginIds
};

function saveDatapointsAndEntitiesFoundInThem(saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) {
  return datapointsFoundEntitiesStream
    .compact()
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(datapointsBatch => {
      const datapointsByFilename = groupDatapointsByFilename(datapointsBatch);
      const entitiesFoundInDatapoints = _.flatten(_.map(datapointsBatch, 'entitiesFoundInDatapoint'));

      return hi(
        saveEntitiesFoundInDatapoints(entitiesFoundInDatapoints)
          .then(saveDatapoints(datapointsByFilename, externalContextFrozen))
      );
    });
}

function groupDatapointsByFilename(datapointsBatch) {
  return _.chain(datapointsBatch)
    .groupBy('context.filename')
    .mapValues((datapoints: any[], filename) => {
      const anyDatapoint = _.head(datapoints);
      const dimensions = _.get(anyDatapoint, 'context.dimensions', {});

      return {
        filename,
        datapoints,
        context: anyDatapoint.context,
        measures: _.get(anyDatapoint, 'context.measures'),
        dimensions,
        dimensionsConcepts: flattenDimensions(dimensions)
      };
    })
    .value();
}

function flattenDimensions(dimensions) {
  const flatDimensionsSet = _.reduce(dimensions, (result, dimension: any) => {
    const domain = _.get(dimension, 'domain');
    if (domain) {
      result.add(_.toString(_.get(domain, 'originId', domain)));
    }
    result.add(_.toString(dimension.originId));
    return result;
  }, new Set());

  return Array.from(flatDimensionsSet);
}

function saveDatapoints(datapointsByFilename, externalContextFrozen) {
  return entitiesFoundInDatapointsByGid => {
    return Promise.all(_.map(datapointsByFilename, (datapointsFromSameFile: any) => {
      datapointsFromSameFile.context.segregatedEntities.foundInDatapointsByGid = entitiesFoundInDatapointsByGid;
      return mapAndStoreDatapointsToDb(datapointsFromSameFile, externalContextFrozen);
    }));
  };
}

function mapAndStoreDatapointsToDb(datapointsFromSameFile, externalContext) {
  const {measures, filename, dimensions, dimensionsConcepts, context: {segregatedEntities: entities}} = datapointsFromSameFile;

  const {dataset: {_id: datasetId}, transaction: {createdAt: version}, concepts} = externalContext;

  const mappingContext = {
    measures,
    filename,
    dimensions,
    dimensionsConcepts,
    entities,
    datasetId,
    version,
    concepts
  };

  const wsDatapoints = _.flatMap(datapointsFromSameFile.datapoints, datapointWithContext => {
    return ddfMappers.mapDdfDataPointToWsModel(datapointWithContext.datapoint, mappingContext);
  });

  logger.debug('Store datapoints to database. Amount: ', _.size(wsDatapoints));
  return DatapointsRepositoryFactory.versionAgnostic().create(wsDatapoints);
}

function findAllEntities(externalContext) {
  const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = externalContext;

  return EntitiesRepositoryFactory
    .latestVersion(datasetId, version)
    .findAll()
    .then(segregateEntities);
}

function findAllPreviousEntities(externalContext) {
  const {dataset: {_id: datasetId}, previousTransaction: {createdAt: version}} = externalContext;

  return EntitiesRepositoryFactory
    .currentVersion(datasetId, version)
    .findAll()
    .then(segregateEntities);
}

function getDimensionsAndMeasures(resource, externalContext) {
  logger.debug('Processing resource with path: ', resource.path);
  const measures = _.merge(
    _.pick(externalContext.previousConcepts, resource.indicators),
    _.pick(externalContext.concepts, resource.indicators)
  );

  const dimensions = _.merge(
    _.pick(externalContext.previousConcepts, resource.dimensions),
    _.pick(externalContext.concepts, resource.dimensions)
  );

  if (_.isEmpty(measures)) {
    throw Error(`Measures were not found for indicators: ${resource.indicators} from resource ${resource.path}`);
  }

  if (_.isEmpty(dimensions)) {
    throw Error(`Dimensions were not found for dimensions: ${resource.dimensions} from resource ${resource.path}`);
  }

  return { measures, dimensions };
}

function getDimensionsAsEntityOriginIds(datapoint, externalContext) {
  const entityGids = _.chain(datapoint)
    .pick(_.keys(externalContext.dimensions))
    .values()
    .compact()
    .value();

  return _.flatMap(entityGids, (gid: string) => {
    const entities = externalContext.segregatedEntities.groupedByGid[gid] || externalContext.segregatedPreviousEntities.groupedByGid[gid];
    return _.map(entities, 'originId');
  });
}

function segregateEntities(entities) {
  //FIXME: Segregation is a workaround for issue related to having same gid in couple entity files
  return _.reduce(entities, (result, entity: any) => {
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
  const alreadyFoundEntityGids = new Set();

  const {transaction: {createdAt: version}, dataset: {_id: datasetId}, timeConcepts} = externalContext;

  return _.reduce(context.dimensions, (entitiesFoundInDatapoint, concept: any) => {
    const domain = concept.domain || concept;
    const entityGid = datapoint[concept.gid];
    const existedEntity = context.segregatedEntities.byGid[entityGid];
    const alreadyFoundEntity = alreadyFoundEntityGids.has(entityGid);

    if (!existedEntity && !alreadyFoundEntity) {

      const entityFoundInDatapoint = ddfMappers.mapDdfEntityFoundInDatapointToWsModel(datapoint, {
        version,
        datasetId,
        timeConcepts,
        domain,
        concept,
        filename: context.filename
      });

      alreadyFoundEntityGids.add(entityGid);
      entitiesFoundInDatapoint.push(entityFoundInDatapoint);
    }

    return entitiesFoundInDatapoint;
  }, []);
}

function createEntitiesFoundInDatapointsSaverWithCache() {
  const entitiesFoundInDatapointsCache = {};
  return (entities) => {
    const notSeenEntities = _.reduce(entities, (result, entity: any) => {
      if (!entitiesFoundInDatapointsCache[entity.gid]) {
        entitiesFoundInDatapointsCache[entity.gid] = entity;
        result.push(entity);
      }
      return result;
    }, []);

    if (_.isEmpty(notSeenEntities)) {
      return Promise.resolve(entitiesFoundInDatapointsCache);
    }

    return storeEntitiesToDb(notSeenEntities)
      .then(entityModels => {
        return _.reduce(entityModels, (cache, model: MongooseDocument) => {
          const entity: any = model.toObject();
          cache[entity.gid] = entity;
          return cache;
        }, entitiesFoundInDatapointsCache);
      });
  };
}

function storeEntitiesToDb(entities) {
  logger.debug(`Store entities found in datapoints to database. Amount: `, _.size(entities));
  return EntitiesRepositoryFactory.versionAgnostic().create(entities);
}
