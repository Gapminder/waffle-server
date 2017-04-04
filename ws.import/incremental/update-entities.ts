import * as _ from 'lodash';
import * as hi from 'highland';
import * as path from 'path';
import * as async from 'async';
import {logger} from '../../ws.config/log';
import {constants} from '../../ws.utils/constants';
import * as fileUtils from '../../ws.utils/file';
import * as ddfMappers from '../utils/ddf-mappers';
import {ChangesDescriptor} from '../utils/changes-descriptor';
import * as entitiesUtils from '../utils/entities.utils';
import * as ddfImportUtils from '../utils/import-ddf.utils';
import {EntitiesRepositoryFactory} from '../../ws.repository/ddf/entities/entities.repository';

export {
  startEntitiesUpdate as updateEntities
};

function startEntitiesUpdate(externalContext, done) {
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
}

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
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, context, changesDescriptor.changes);
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
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, externalContextFrozen, changesDescriptor.changedObject);

      const oldResource = changesDescriptor.oldResource;
      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = entitiesUtils.getSetsAndDomain(oldResource, externalContextFrozen, changesDescriptor.original);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};
      return {changesDescriptor, context: _.extend({filename: _.get(currentResource, 'path'), oldFilename: _.get(oldResource, 'path')}, setsAndDomain, oldSetsAndDomain, context)};
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
      } = entitiesUtils.getSetsAndDomain(changesDescriptor.oldResource, externalContextFrozen, changesDescriptor.original);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};

      return {changesDescriptor, context: _.extend({oldFilename: _.get(changesDescriptor.oldResource, 'path')}, oldSetsAndDomain, context)};
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
  return EntitiesRepositoryFactory.versionAgnostic().create(createdEntities, onEntitiesCreated);
}

function closeEntities({entityChangesBatch, externalContext, handleClosedEntity}, onAllEntitiesClosed) {
  const entitiesRepository = EntitiesRepositoryFactory
    .latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt);

  return async.eachLimit(entityChangesBatch, constants.LIMIT_NUMBER_PROCESS, ({changesDescriptor, context}, onEntityClosed) => {
    const query = {
      domain: context.oldEntityDomain.originId,
      sets: context.oldEntitySetsOriginIds,
      [`properties.${changesDescriptor.concept}`]: changesDescriptor.gid,
      sources: context.oldFilename
    };

    logger.debug('Closing entity by query: ', query);
    return entitiesRepository.closeOneByQuery(query, (error, closedEntity) => {
      if (error) {
        return onEntityClosed(error);
      }

      if (!closedEntity) {
        logger.error(`Entity was not closed, though it should be`, query, changesDescriptor.original);
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
