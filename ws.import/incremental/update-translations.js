'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const async = require('async');
const logger = require('../../ws.config/log');
const constants = require('../../ws.utils/constants');
const translationsUtils = require('../utils/translations.utils');
const datapackageParser = require('../utils/datapackage.parser');
const ddfMappers = require('../utils/ddf-mappers');
const ddfImportUtils = require('../utils/import-ddf.utils');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');

module.exports = startTranslationsUpdate;

function startTranslationsUpdate(externalContext, done) {
  logger.info('Start translations updating process');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToLangDiff',
    'transaction',
    'dataset',
  ]));

  const translationsDiffStream = ddfImportUtils
    .readTextFileByLineAsJsonStream(externalContextFrozen.pathToLangDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.ENTITIES));

  const translationsDiffProcessingStream = hi([
    toCreatedTranslationsStream(translationsDiffStream, externalContextFrozen),
    toUpdatedTranslationsStream(translationsDiffStream, externalContextFrozen),
    toRemovedTranslationsStream(translationsDiffStream, externalContextFrozen)
  ]).parallel(3);

  return ddfImportUtils.startStreamProcessing(translationsDiffProcessingStream, externalContext, done);
}

function toUpdatedTranslationsStream(translationsDiffStream, externalContext) {
  return translationsDiffStream.fork()
    .filter(changesDescriptor => changesDescriptor.isUpdateAction());
}

function toCreatedTranslationsStream(translationsDiffStream, externalContext) {
  return translationsDiffStream.fork()
    .filter(changesDescriptor => changesDescriptor.isCreateAction());
}

function toRemovedTranslationsStream(translationsDiffStream, externalContext) {
  return translationsDiffStream.fork()
    .filter(changesDescriptor => changesDescriptor.isRemoveAction())
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(changesDescriptors => {
      return hi.wrapCallback(closeEntities)({
        changesDescriptors,
        externalContext: externalContext,
        handleClosedEntity: updateEntityTranslation
      });
    });
}

function updateEntityTranslation({changesDescriptor, context}, foundEntity, closingQuery, onEntityClosed) {
  const entityRepository = entitiesRepositoryFactory
    .latestVersion(context.dataset._id, context.transaction.createdAt);

  if (foundEntity.from === context.transaction.createdAt) {
    // JUST DO AN UPDATE
    entityRepository.removeTranslation({
      entityId: foundEntity._id,
      language: changesDescriptor.language
    });
  } else {
    // CLOSE FOUND
    // CREATE A NEW ENTITY BASED ON FOUND ONE
    entityRepository.closeOneByQuery(closingQuery, (error, closedEntity) => {
      // const _.omit(closedEntity.languages, );
    });
  }

  // entitiesRepositoryFactory
  //   .latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
  //   .updateTranslation(, changesDescriptor.getLanguage, onEntityClosed);
}

function closeEntities({changesDescriptors, externalContext, handleClosedEntity}, onAllEntitiesClosed) {
  const entitiesRepository = entitiesRepositoryFactory
    .latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt);

  return async.eachLimit(changesDescriptors, constants.LIMIT_NUMBER_PROCESS, ({changesDescriptor, context}, onEntityClosed) => {
    const closingQuery = {
      domain: context.oldEntityDomain.originId,
      sets: context.oldEntitySetsOriginIds,
      [`properties.${changesDescriptor.concept}`]: changesDescriptor.gid
    };

    logger.debug('Closing entity by query: ', closingQuery);
    return entitiesRepository.findOneByDomainAndSetsAndProps(closingQuery, (error, foundEntity) => {
      if (error) {
        return onEntityClosed(error);
      }

      if (!foundEntity) {
        logger.error('Entity was not closed, though it should be');
        return onEntityClosed(null);
      }

      logger.debug('Entity was closed. OriginId: ', foundEntity.originId);

      if (!handleClosedEntity) {
        return onEntityClosed(null);
      }

      return handleClosedEntity({changesDescriptor, context}, foundEntity, closingQuery, onEntityClosed);
    });
  }, onAllEntitiesClosed);
}


class ChangesDescriptor {
  constructor(rawChangesDescriptor) {
    this.object = _.get(rawChangesDescriptor, 'object', {});
    this.metadata = _.get(rawChangesDescriptor, 'metadata', {});
  }

  get gid() {
    return this.original[this.original.gid];
  }

  get concept() {
    return this.original.gid;
  }

  get changes() {
    if (this.isUpdateAction()) {
      return this.object['data-update'];
    }
    return this.object;
  }

  get original() {
    if (this.isUpdateAction()) {
      return this.object['data-origin'];
    }
    return this.object;
  }

  get language() {
    return this.metadata.lang;
  }

  get oldResource() {
    const oldResource = _.get(this.metadata.file, 'old');
    return this._parseResource(oldResource);
  }

  get currentResource() {
    const currentResource = _.get(this.metadata.file, 'new');
    return this._parseResource(currentResource);
  }

  get removedColumns() {
    return this.metadata.removedColumns || [];
  }

  describes(dataType) {
    return this.metadata.type === dataType;
  }

  isCreateAction() {
    return this.metadata.action === 'create';
  }

  isRemoveAction() {
    return this.metadata.action === 'remove';
  }

  isUpdateAction() {
    return ddfImportUtils.UPDATE_ACTIONS.has(this.metadata.action);
  }

  _parseResource(resource) {
    if (this.describes(constants.CONCEPTS)) {
      return datapackageParser.parseConceptsResource(resource);
    }

    if (this.describes(constants.ENTITIES)) {
      return datapackageParser.parseEntitiesResource(resource);
    }

    return datapackageParser.parseDatapointsResource(resource);
  }
}
