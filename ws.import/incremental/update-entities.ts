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
import { DatasetTracker } from '../../ws.services/datasets-tracker';
import {AsyncResultCallback, ErrorCallback} from 'async';

export {
  startEntitiesUpdate as updateEntities
};

function startEntitiesUpdate(externalContext: any, done: Function): void {
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

function updateEntities(externalContextFrozen: any): void {
  const getEntityChangesStream = () => fileUtils.readTextFileByLineAsJsonStream(externalContextFrozen.pathToDatasetDiff)
    .map((changes: any) => new ChangesDescriptor(changes))
    .filter((changesDescriptor: ChangesDescriptor) => changesDescriptor.describes(constants.ENTITIES))
    .map((changesDescriptor: ChangesDescriptor) => {
      return {changesDescriptor, context: _.extend(externalContextFrozen)};
    });
  const entityChangesStream = getEntityChangesStream();
  const entityChangesStreamForRemoveColumns = getEntityChangesStream();;

  return (hi([
    toRemovedEntitiesStream(entityChangesStream, externalContextFrozen),
    toCreatedEntitiesStream(entityChangesStream, externalContextFrozen),
    toUpdatedEntitiesStream(entityChangesStream, externalContextFrozen)
  ])
    .parallel(3)
    .reduce(0, (a: number) => a)
    .flatMap(() => {
      return toRemovedColumns(entityChangesStreamForRemoveColumns, externalContextFrozen);
    }));
}

function toRemovedColumns(removedColumnsChangesStream: any, externalContextFrozen: any): void {
  return removedColumnsChangesStream.fork().filter(({changesDescriptor}: any) =>
    !!changesDescriptor && changesDescriptor.isUpdateAction() &&
    !_.isEmpty(changesDescriptor.removedColumns))
    .map(({changesDescriptor, context}: any) => {
      const {metadata, object} = changesDescriptor.rawData;
      const newChangesDescriptor = new ChangesDescriptor({
        metadata,
        object: _.extend(_.omit(object, ['data-update']), {'data-update': {}})
      });

      const currentResource = newChangesDescriptor.currentResource;
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, externalContextFrozen, newChangesDescriptor.changedObject);
      const oldResource = newChangesDescriptor.oldResource;
      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = entitiesUtils.getAllSetsAndDomain(oldResource, externalContextFrozen);
      const {
        entitySetsOriginIds: newEntitySetsOriginIds
      } = entitiesUtils.getAllSetsAndDomain(currentResource, externalContextFrozen);
      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};
      const temporaryContext = _.extend({
        filename: _.get(currentResource, 'path'),
        oldFilename: _.get(oldResource, 'path')
      }, setsAndDomain, oldSetsAndDomain, context);

      temporaryContext.entitySetsOriginIds = newEntitySetsOriginIds;

      return {changesDescriptor: newChangesDescriptor, context: temporaryContext};
    })
    .flatMap((updatedEntitiesBatch: any) => {
      DatasetTracker
        .get(externalContextFrozen.dataset.name)
        .increment(constants.ENTITIES, updatedEntitiesBatch.length);
      logger.debug('Detecting entities with removed columns. Amount: ', _.size(updatedEntitiesBatch));
      return hi.wrapCallback(closeEntitiesAndRemoveColumns)({
        entityChangesBatch: updatedEntitiesBatch,
        externalContext: externalContextFrozen
      });
    });
}

function toCreatedEntitiesStream(entityChangesStream: any, externalContextFrozen: any): void {
  logger.info('Start creating entities');
  return entityChangesStream.fork()
    .filter(({changesDescriptor}: any) => changesDescriptor.isCreateAction())
    .map(({changesDescriptor, context}: any) => {
      const currentResource = changesDescriptor.currentResource;
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, context, changesDescriptor.changes);
      return ddfMappers.mapDdfEntityToWsModel(changesDescriptor.changes, _.extend({filename: currentResource.path}, setsAndDomain, context));
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((entitiesBatch: any) => {
      DatasetTracker
        .get(externalContextFrozen.dataset.name)
        .increment(constants.ENTITIES, entitiesBatch.length);
      logger.debug('Saving batch of created entities. Amount: ', _.size(entitiesBatch));

      return hi(storeEntitiesToDb(entitiesBatch));
    });
}

function toUpdatedEntitiesStream(entityChangesStream: any, externalContextFrozen: any): void {
  logger.info('Start updating entities');
  return entityChangesStream.fork()
    .filter(({changesDescriptor}: any) => changesDescriptor.isUpdateAction())
    .map(({changesDescriptor, context}: any) => {
      const currentResource = changesDescriptor.currentResource;
      const setsAndDomain = entitiesUtils.getSetsAndDomain(currentResource, externalContextFrozen, changesDescriptor.changedObject);

      const oldResource = changesDescriptor.oldResource;
      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = entitiesUtils.getSetsAndDomain(oldResource, externalContextFrozen, changesDescriptor.original);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};
      return {
        changesDescriptor,
        context: _.extend({
          filename: _.get(currentResource, 'path'),
          oldFilename: _.get(oldResource, 'path')
        }, setsAndDomain, oldSetsAndDomain, context)
      };
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((updatedEntitiesBatch: any) => {
      DatasetTracker
        .get(externalContextFrozen.dataset.name)
        .increment(constants.ENTITIES, updatedEntitiesBatch.length);
      logger.debug('Updating batch of entities. Amount: ', _.size(updatedEntitiesBatch));

      return hi.wrapCallback(closeEntities)({
        entityChangesBatch: updatedEntitiesBatch,
        externalContext: externalContextFrozen,
        handleClosedEntity: createUpdatedEntity
      });
    });
}

function toRemovedEntitiesStream(entityChangesStream: any, externalContextFrozen: any): void {
  logger.info('Start removing entities');
  return entityChangesStream.fork()
    .filter(({changesDescriptor}: any) => changesDescriptor.isRemoveAction())
    .map(({changesDescriptor, context}: any) => {

      const {
        entitySet: oldEntitySet,
        entityDomain: oldEntityDomain,
        entitySetsOriginIds: oldEntitySetsOriginIds
      } = entitiesUtils.getSetsAndDomain(changesDescriptor.oldResource, externalContextFrozen, changesDescriptor.original);

      const oldSetsAndDomain = {oldEntitySet, oldEntityDomain, oldEntitySetsOriginIds};

      return {
        changesDescriptor,
        context: _.extend({oldFilename: _.get(changesDescriptor.oldResource, 'path')}, oldSetsAndDomain, context)
      };
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((removedEntitiesBatch: any) => {
      DatasetTracker
        .get(externalContextFrozen.dataset.name)
        .increment(constants.ENTITIES, removedEntitiesBatch.length);
      logger.debug('Removing batch of entities. Amount: ', _.size(removedEntitiesBatch));
      return hi.wrapCallback(closeEntities)({
        entityChangesBatch: removedEntitiesBatch,
        externalContext: externalContextFrozen
      });
    });
}

function storeEntitiesToDb(createdEntities: any): any {
  return EntitiesRepositoryFactory.versionAgnostic().create(createdEntities);
}

function closeEntities({entityChangesBatch, externalContext, handleClosedEntity}: any, onAllEntitiesClosed: ErrorCallback<Error>): void {
  const entitiesRepository = EntitiesRepositoryFactory
    .latestExceptCurrentVersion(externalContext.dataset._id, externalContext.transaction.createdAt);

  return async.eachLimit(entityChangesBatch, constants.LIMIT_NUMBER_PROCESS, ({changesDescriptor, context}: any, onEntityClosed: Function): Promise<Object> => {
    const query = {
      domain: context.oldEntityDomain.originId,
      sets: context.oldEntitySetsOriginIds,
      [`properties.${changesDescriptor.concept}`]: changesDescriptor.gid,
      sources: context.oldFilename
    };

    logger.debug('Closing entity by query: ', query);
    return entitiesRepository.closeOneByQuery(query, (error: string, closedEntity: any) => {
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
  }, (error: any) => {
    return onAllEntitiesClosed(error);
  });
}

function closeEntitiesAndRemoveColumns({entityChangesBatch, externalContext}: any, onAllEntitiesClosed: AsyncResultCallback<object, Error>): void {
  const entitiesRepository = EntitiesRepositoryFactory
    .latestExceptCurrentVersion(externalContext.dataset._id, externalContext.transaction.createdAt);

  const query = {
    domain: entityChangesBatch.context.oldEntityDomain.originId,
    sets: entityChangesBatch.context.oldEntitySetsOriginIds,
    sources: entityChangesBatch.context.oldFilename
  };

  return entitiesRepository.closeAllByQuery(query, (error: any, closedEntities: any[]) => {
    if (error) {
      return onAllEntitiesClosed(error);
    }

    if (_.isEmpty(closedEntities)) {
      logger.debug(`Entities does not found`, query, entityChangesBatch.changesDescriptor.original);
      return onAllEntitiesClosed(null, externalContext);
    }

    const actions = closedEntities.map((closedEntity: any) => (onEntityCreated: Function) => {
      createUpdatedEntity({
        changesDescriptor: entityChangesBatch.changesDescriptor,
        context: entityChangesBatch.context
      }, closedEntity, onEntityCreated);
    });

    async.parallelLimit(actions, 10, (_error: any) => {
      return onAllEntitiesClosed(_error, externalContext);
    });
  });
}

function createUpdatedEntity({changesDescriptor, context}: any, closedEntity: any, done: Function): void {
  logger.debug('Creating updated entity based on its closed version');

  const entityPropertiesWithoutRemovedColumns = _.omit(closedEntity.properties, changesDescriptor.removedColumns);
  const updatedEntityProperties = _.extend(entityPropertiesWithoutRemovedColumns, changesDescriptor.changes);
  const newEntity = entitiesUtils.makeEntityBasedOnItsClosedVersion(updatedEntityProperties, closedEntity, context);

  return storeEntitiesToDb(newEntity)
    .then((docs: any[]) => done(null, docs))
    .catch((error: string) => done(error));
}
