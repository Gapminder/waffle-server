'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');
const path = require('path');
const async = require('async');

const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const fileUtils = require('../../ws.utils/file');
const ddfMappers = require('../utils/ddf-mappers');
const ChangesDescriptor = require('../utils/changes-descriptor').ChangesDescriptor;
const entitiesUtils = require('../utils/entities.utils');
const ddfImportUtils = require('../utils/import-ddf.utils');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');

module.exports = function startEntitiesUpdate(externalContext, done) {
  logger.debug('Start process of entities update');

  const externalContextFrozen = Object.freeze({
    pathToDatasetDiff: externalContext.pathToDatasetDiff,
    previousConcepts: externalContext.previousConcepts,
    concepts: externalContext.concepts,
    timeConcepts: externalContext.timeConcepts,
    transaction: externalContext.transaction,
    dataset: externalContext.dataset,
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt
  });

  const entitiesUpdateStream = updateEntities(externalContextFrozen);
  ddfImportUtils.startStreamProcessing(entitiesUpdateStream, externalContext, done);
};

function updateEntities(externalContextFrozen) {
  const entityChangesStream =
    fileUtils.readTextFileByLineAsJsonStream(externalContextFrozen.pathToDatasetDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.ENTITIES))
    .map(changesDescriptor => {
      return {changesDescriptor, context: _.extend(externalContextFrozen)};
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
    .filter(({changesDescriptor}) => changesDescriptor.isCreateAction())
    .map(({changesDescriptor, context}) => {
      const currentResource = changesDescriptor.currentResource;
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, context);
      return ddfMappers.mapDdfEntityToWsModel(changesDescriptor.changes, _.extend({filename: currentResource.path}, setsAndDomain, context));
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(entitiesBatch => {
      logger.debug('Saving batch of created entities. Amount: ', _.size(entitiesBatch));
      return hi.wrapCallback(storeEntitiesToDb)(entitiesBatch);
    });
}

function toUpdatedEntitiesStream(entityChangesStream, externalContextFrozen) {
  logger.info('Start updating entities');
  return entityChangesStream.fork()
    .filter(({changesDescriptor}) => changesDescriptor.isUpdateAction())
    .map(({changesDescriptor, context}) => {
      const currentResource = changesDescriptor.currentResource;
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, externalContextFrozen);

      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = entitiesUtils.getSetsAndDomain(changesDescriptor.oldResource, externalContextFrozen);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};
      return {changesDescriptor, context: _.extend({filename: _.get(currentResource, 'path')}, setsAndDomain, oldSetsAndDomain, context)};
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
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
    .filter(({changesDescriptor}) => changesDescriptor.isRemoveAction())
    .map(({changesDescriptor, context}) => {

      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = entitiesUtils.getSetsAndDomain(changesDescriptor.oldResource, externalContextFrozen);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};

      return {changesDescriptor, context: _.extend(oldSetsAndDomain, context)};
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
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

  return async.eachLimit(entityChangesBatch, constants.LIMIT_NUMBER_PROCESS, ({changesDescriptor, context}, onEntityClosed) => {
    const query = {
      domain: context.oldEntityDomain.originId,
      sets: context.oldEntitySetsOriginIds,
      [`properties.${changesDescriptor.concept}`]: changesDescriptor.gid
    };

    logger.debug('Closing entity by query: ', query);
    return entitiesRepository.closeOneByQuery(query, (error, closedEntity) => {
      if (error) {
        return onEntityClosed(error);
      }

      if (!closedEntity) {
        logger.error('Entity was not closed, though it should be');
        return onEntityClosed(null);
      }

      logger.debug('Entity was closed. OriginId: ', closedEntity.originId);

      if (!handleClosedEntity) {
        return onEntityClosed(null);
      }

      return handleClosedEntity({changesDescriptor, context}, closedEntity, onEntityClosed);
    });
  }, onAllEntitiesClosed);
}

function createUpdatedEntity({changesDescriptor, context}, closedEntity, done) {
  logger.debug('Creating updated entity based on its closed version');

  const entityPropertiesWithoutRemovedColumns = _.omit(closedEntity.properties, changesDescriptor.removedColumns);
  const updatedEntityProperties = _.extend(entityPropertiesWithoutRemovedColumns, changesDescriptor.changes);

  const newEntity = entitiesUtils.makeEntityBasedOnItsClosedVersion(updatedEntityProperties, closedEntity, context);
  return storeEntitiesToDb(newEntity, done);
}
