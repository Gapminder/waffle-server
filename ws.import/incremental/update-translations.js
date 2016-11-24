'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const async = require('async');
const logger = require('../../ws.config/log');
const constants = require('../../ws.utils/constants');
const translationsUtils = require('../utils/translations.utils');
const entitiesUtils = require('../utils/entities.utils');
const datapackageParser = require('../utils/datapackage.parser');
const ddfMappers = require('../utils/ddf-mappers');
const ddfImportUtils = require('../utils/import-ddf.utils');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');

module.exports = startTranslationsUpdate;

function startTranslationsUpdate(externalContext, done) {
  logger.info('Start translations updating process');

  const externalContextSubset = _.pick(externalContext, [
    'pathToLangDiff',
    'concepts',
    'previousConcepts',
  ]);

  const externalContextFrozen = Object.freeze(_.extend({
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt
  }, externalContextSubset));

  const translationsDiffStream = ddfImportUtils
    .readTextFileByLineAsJsonStream(externalContextFrozen.pathToLangDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.ENTITIES))
    .map(changesDescriptor => ({context: externalContextFrozen, changesDescriptor}));

  const translationsDiffProcessingStream = hi([
    toCreatedTranslationsStream(translationsDiffStream, externalContextFrozen),
    toUpdatedTranslationsStream(translationsDiffStream, externalContextFrozen),
    toRemovedTranslationsStream(translationsDiffStream, externalContextFrozen)
  ]).parallel(3);

  return ddfImportUtils.startStreamProcessing(translationsDiffProcessingStream, externalContext, done);
}

function toUpdatedTranslationsStream(translationsDiffStream, externalContext) {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}) => {
      return changesDescriptor.isUpdateAction();
    })
    .map(({changesDescriptor, context}) => {
      const setsAndDomain = entitiesUtils.getSetsAndDomain(changesDescriptor.currentResource, context);
      return hi.wrapCallback(removeTranslation)({
        changesDescriptor,
        context: _.extend(setsAndDomain, context),
        translationChangeHandler: updateTranslationInEntity
      });
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function toCreatedTranslationsStream(translationsDiffStream, externalContext) {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}) => {
      return changesDescriptor.isCreateAction();
    })
    .map(({changesDescriptor, context}) => {
        const setsAndDomain = entitiesUtils.getSetsAndDomain(changesDescriptor.currentResource, context);
        return hi.wrapCallback(removeTranslation)({
          changesDescriptor,
          context: _.extend(setsAndDomain, context),
          translationChangeHandler: addTranslationToEntity
        });
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function toRemovedTranslationsStream(translationsDiffStream, externalContext) {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}) => {
      return changesDescriptor.isRemoveAction();
    })
    .map(({changesDescriptor, context}) => {
      const setsAndDomain = entitiesUtils.getSetsAndDomain(changesDescriptor.oldResource, context);
      return hi.wrapCallback(removeTranslation)({
        changesDescriptor,
        context: _.extend(setsAndDomain, context),
        translationChangeHandler: removeTranslationFromEntity
      });
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function removeTranslation({changesDescriptor, context, translationChangeHandler}, onTranslationRemoved) {
  const closingQuery = {
    domain: context.entityDomain.originId,
    sets: context.entitySetsOriginIds,
    [`properties.${changesDescriptor.concept}`]: changesDescriptor.gid
  };

  logger.warn('ACTION: ', translationChangeHandler.name);
  logger.warn({obj: closingQuery});

  return entitiesRepositoryFactory.latestVersion(context.datasetId, context.version)
    .findOneByDomainAndSetsAndProperties(closingQuery, (error, foundEntity) => {
      if (error) {
        return onTranslationRemoved(error);
      }

      if (!foundEntity) {
        logger.warn('Entity was closed, so there is no need to update translations');
        return onTranslationRemoved(null);
      }

      logger.debug('Entity was closed. OriginId: ', foundEntity.originId);

      if (!translationChangeHandler) {
        return onTranslationRemoved(null);
      }

      return translationChangeHandler({changesDescriptor, context}, foundEntity, closingQuery, onTranslationRemoved);
    });
}

function removeTranslationFromEntity({changesDescriptor, context}, foundEntity, closingQuery, onTranslationRemoved) {
  const entityRepository = entitiesRepositoryFactory.latestVersion(context.datasetId, context.version);

  if (foundEntity.from === context.version) {
    return entityRepository.removeTranslation({
      entityId: foundEntity._id,
      language: changesDescriptor.language
    }, onTranslationRemoved);
  }

  return entityRepository.closeOneByQuery(closingQuery, (error, closedEntity) => {
    closedEntity.languages = _.omit(closedEntity.languages, changesDescriptor.language);
    const newEntity = makeEntityBasedOnItsClosedVersion(closedEntity.properties, closedEntity, context);
    entityRepository.create(newEntity, onTranslationRemoved);
  });
}

function addTranslationToEntity({changesDescriptor, context}, foundEntity, closingQuery, onTranslationAdded) {
  const entityRepository = entitiesRepositoryFactory.latestVersion(context.datasetId, context.version);

  if (foundEntity.from === context.version) {
    return entityRepository.addTranslation({
      entityId: foundEntity._id,
      language: changesDescriptor.language,
      translation: changesDescriptor.changes
    }, onTranslationAdded);
  }

  return entityRepository.closeOneByQuery(closingQuery, (error, closedEntity) => {
    closedEntity.languages = _.extend(closedEntity.languages, {[changesDescriptor.language]: changesDescriptor.changes});
    const newEntity = makeEntityBasedOnItsClosedVersion(closedEntity.properties, closedEntity, context);
    entityRepository.create(newEntity, onTranslationAdded);
  });
}

function updateTranslationInEntity({changesDescriptor, context}, foundEntity, closingQuery, onTranslationAdded) {
  const entityRepository = entitiesRepositoryFactory.latestVersion(context.datasetId, context.version);

  const updatedTranslation = _.omit(_.extend(_.get(foundEntity.languages, changesDescriptor.language), changesDescriptor.changes), changesDescriptor.removedColumns);
  if (foundEntity.from === context.version) {
    return entityRepository.addTranslation({
      entityId: foundEntity._id,
      language: changesDescriptor.language,
      translation: updatedTranslation
    }, onTranslationAdded);
  }

  return entityRepository.closeOneByQuery(closingQuery, (error, closedEntity) => {
    _.extend(closedEntity.languages, {[changesDescriptor.language]: updatedTranslation});
    const newEntity = makeEntityBasedOnItsClosedVersion(closedEntity.properties, closedEntity, context);
    entityRepository.create(newEntity, onTranslationAdded);
  });
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

class ChangesDescriptor {
  constructor(rawChangesDescriptor) {
    this.object = _.get(rawChangesDescriptor, 'object', {});
    this.metadata = _.get(rawChangesDescriptor, 'metadata', {});
    this._cachedOldResource = null;
    this._cachedCurrentResource = null;
  }

  get gid() {
    return this.original[this.concept];
  }

  get concept() {
    if (this.isCreateAction()) {
      return _.head(_.get(this.currentResource, 'primaryKey'));
    }
    return this.original.gid;
  }

  get changes() {
    if (this.isUpdateAction()) {
      return this.object['data-update'];
    }
    return this.object;
  }

  get original() {
    if (this.isUpdateAction() && this.object['data-origin']) {
      return this.object['data-origin'];
    }
    return this.object;
  }

  get language() {
    return this.metadata.lang;
  }

  get oldResource() {
    if (!this._cachedOldResource) {
      const oldResource = _.get(this.metadata.file, 'old');
      this._cachedOldResource = this._parseResource(oldResource);
    }
    return this._cachedOldResource;
  }

  get currentResource() {
    if (!this._cachedCurrentResource) {
      const currentResource = _.get(this.metadata.file, 'new');
      this._cachedCurrentResource = this._parseResource(currentResource);
    }
    return this._cachedCurrentResource;
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
