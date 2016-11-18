'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');
const path = require('path');
const async = require('async');
const byline = require('byline');
const JSONStream = require('JSONStream');

const ddfMappers = require('../utils/ddf-mappers');
const datapackageParser = require('../utils/datapackage.parser');
const entitiesUtils = require('../utils/entities.utils');
const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');

const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');

const DEFAULT_CHUNK_SIZE = 2000;
const UPDATE_ACTION = new Set(['change', 'update']);

module.exports = startEntitiesUpdate;

function startEntitiesUpdate(externalContext, done) {
  logger.debug('Start process of entities update');

  const externalContextSubset = _.pick(externalContext, [
    'pathToDatasetDiff',
    'previousConcepts',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset',
  ]);

  const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = externalContextSubset;

  const externalContextFrozen = Object.freeze(_.extend(externalContextSubset, {datasetId, version}));

  const errors = [];
  updateEntities(externalContextFrozen)
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

function updateEntities(externalContextFrozen) {
  const fileWithChangesStream = fs.createReadStream(externalContextFrozen.pathToDatasetDiff, {encoding: 'utf8'});

  const changesByLine = byline(fileWithChangesStream).pipe(JSONStream.parse());

  const entityChangesStream = hi(changesByLine)
    .filter(changes => changes.metadata.type === constants.ENTITIES)
    .map(entityChanges => {
      return {entityChanges, context: _.extend(externalContextFrozen)};
    });

  return hi([
    toRemovedEntitiesStream(entityChangesStream, externalContextFrozen),
    toCreatedEntitiesStream(entityChangesStream),
    toUpdatedEntitiesStream(entityChangesStream, externalContextFrozen)
  ]).parallel(3);
}

function toCreatedEntitiesStream(entityChangesStream) {
  logger.info('Start creating entities');
  return entityChangesStream.fork()
    .filter(({entityChanges}) => getAction(entityChanges.metadata) === 'create')
    .map(({entityChanges, context}) => {
      const resource = _.get(entityChanges, 'metadata.file.new');
      const setsAndDomain = getSetsAndDomain(resource, context);

      return ddfMappers.mapDdfEntityToWsModel(entityChanges.object, _.extend({filename: resource.path}, setsAndDomain, context));
    })
    .batch(DEFAULT_CHUNK_SIZE)
    .flatMap(entitiesBatch => {
      logger.debug('Saving batch of created entities. Amount: ', _.size(entitiesBatch));
      return hi.wrapCallback(storeEntitiesToDb)(entitiesBatch);
    });
}

function toUpdatedEntitiesStream(entityChangesStream, externalContextFrozen) {
  logger.info('Start updating entities');
  return entityChangesStream.fork()
    .filter(({entityChanges}) => UPDATE_ACTION.has(getAction(entityChanges.metadata)))
    .map(({entityChanges, context}) => {
      const resource = _.get(entityChanges, 'metadata.file.new');
      const resourceOld = _.get(entityChanges, 'metadata.file.old');
      const filename = _.get(resource, 'path');

      const setsAndDomain = getSetsAndDomain(resource, externalContextFrozen);

      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = getSetsAndDomain(resourceOld, externalContextFrozen);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};

      return {entityChanges, context: _.extend({filename}, setsAndDomain, oldSetsAndDomain, context)};
    })
    .batch(DEFAULT_CHUNK_SIZE)
    .flatMap(updatedEntitiesBatch => {
      logger.debug('Updating batch of entities. Amount: ', _.size(updatedEntitiesBatch));
      return hi.wrapCallback(closeEntities)({
        entityChangesBatch: updatedEntitiesBatch,
        externalContext: externalContextFrozen,
        handleClosedEntity: createUpdatedEntity
      });
    });
}

function toRemovedEntitiesStream(entityChangesStream, externalContextFrozen) {
  logger.info('Start removing entities');
  return entityChangesStream.fork()
    .filter(({entityChanges}) => getAction(entityChanges.metadata) === 'remove')
    .map(({entityChanges, context}) => {
      const resourceOld = _.get(entityChanges, 'metadata.file.old');

      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = getSetsAndDomain(resourceOld, externalContextFrozen);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};

      return {entityChanges, context: _.extend(oldSetsAndDomain, context)};
    })
    .batch(DEFAULT_CHUNK_SIZE)
    .flatMap((removedEntitiesBatch) => {
      logger.debug('Removing batch of entities. Amount: ', _.size(removedEntitiesBatch));
      return hi.wrapCallback(closeEntities)({
        entityChangesBatch: removedEntitiesBatch,
        externalContext: externalContextFrozen
      });
    });
}

function storeEntitiesToDb(createdEntities, onEntitiesCreated) {
  return entitiesRepositoryFactory.versionAgnostic().create(createdEntities, onEntitiesCreated);
}

function closeEntities({entityChangesBatch, externalContext, handleClosedEntity}, onAllEntitiesClosed) {
  const entitiesRepository = entitiesRepositoryFactory
    .latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt);

  return async.eachLimit(entityChangesBatch, constants.LIMIT_NUMBER_PROCESS, ({entityChanges, context}, onEntityClosed) => {
    const query = {
      domain: context.oldEntityDomain.originId,
      sets: context.oldEntitySetsOriginIds,
      [`properties.${entityChanges.object.gid}`]: entityChanges.object[entityChanges.object.gid]
    };

    logger.debug('Closing entity by query: ', query);
    return entitiesRepository.closeOneByQuery(query, (error, closedEntity) => {
      if (error) {
        return onEntityClosed(error);
      }

      if (!handleClosedEntity) {
        logger.error('Entity was not closed, though it should be');
        return onEntityClosed(null);
      }

      logger.debug('Entity was closed. OriginId: ', closedEntity.originId);
      return handleClosedEntity({entityChanges, context}, closedEntity.toObject(), onEntityClosed);
    });
  }, onAllEntitiesClosed);
}

function createUpdatedEntity({entityChanges, context}, closedEntity, done) {
  logger.debug('Creating updated entity based on its closed version');

  const removedColumns = _.get(entityChanges.metadata, 'removedColumns');

  const updatedProperties = _.get(entityChanges.object, 'data-update');
  const entityPropertiesWithoutRemovedColumns = _.omit(closedEntity.properties, removedColumns);

  const updatedEntityProperties = _.extend(entityPropertiesWithoutRemovedColumns, updatedProperties);

  const newEntity = makeEntityBasedOnItsClosedVersion(updatedEntityProperties, closedEntity, context);

  return storeEntitiesToDb(newEntity, done);
}

function makeEntityBasedOnItsClosedVersion(properties, closedEntity, externalContext) {
  const {
    entitySet,
    concepts,
    entityDomain,
    filename,
    timeConcepts,
    version,
    datasetId
  } = externalContext;

  const context = {
    entitySet,
    concepts,
    entityDomain,
    filename,
    timeConcepts,
    version,
    datasetId,
    originId: closedEntity.originId,
    sources: closedEntity.sources,
    languages: closedEntity.languages
  };

  return ddfMappers.mapDdfEntityToWsModel(properties, context);
}

function getAction(metadata) {
  return _.get(metadata, 'action');
}

function getSetsAndDomain(resource, externalContext) {
  const parsedResource = datapackageParser.parseEntitiesResource(resource);
  return entitiesUtils.getSetsAndDomain(parsedResource, externalContext);
}
