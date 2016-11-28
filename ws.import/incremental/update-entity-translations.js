'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const async = require('async');
const logger = require('../../ws.config/log');
const constants = require('../../ws.utils/constants');
const ChangesDescriptor = require('../utils/changes-descriptor').ChangesDescriptor;
const entitiesUtils = require('../utils/entities.utils');
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

  const createTranslationsDiffStream = () => ddfImportUtils
    .readTextFileByLineAsJsonStream(externalContextFrozen.pathToLangDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.ENTITIES))
    .map(changesDescriptor => ({context: externalContextFrozen, changesDescriptor}));

  const translationsDiffStream = createTranslationsDiffStream();

  //Streams order is IMPORTANT HERE - DO NOT TOUCH!
  const translationsDiffProcessingStream = hi([
    toRemovedTranslationsStream(createTranslationsDiffStream(), externalContextFrozen),
    hi([
      toCreatedTranslationsStream(translationsDiffStream, externalContextFrozen),
      toUpdatedTranslationsStream(translationsDiffStream, externalContextFrozen)
    ]).parallel(2)
  ]).sequence();

  return ddfImportUtils.startStreamProcessing(translationsDiffProcessingStream, externalContext, done);
}

function toUpdatedTranslationsStream(translationsDiffStream, externalContext) {
  return toApplyTranslationChangesStream(translationsDiffStream, {
    isApplicable: changesDescriptor => changesDescriptor.isUpdateAction(),
    getResource: changesDescriptor => changesDescriptor.currentResource,
    translationChangeHandler: updateTranslationInEntity,
    repository: entitiesRepositoryFactory.latestVersion(externalContext.datasetId, externalContext.version)
  });
}

function toCreatedTranslationsStream(translationsDiffStream, externalContext) {
  return toApplyTranslationChangesStream(translationsDiffStream, {
    isApplicable: changesDescriptor => changesDescriptor.isCreateAction(),
    getResource: changesDescriptor => changesDescriptor.currentResource,
    translationChangeHandler: addTranslationToEntity,
    repository: entitiesRepositoryFactory.latestVersion(externalContext.datasetId, externalContext.version)
  });
}

function toRemovedTranslationsStream(translationsDiffStream, externalContext) {
  return toApplyTranslationChangesStream(translationsDiffStream, {
    isApplicable: changesDescriptor => changesDescriptor.isRemoveAction(),
    getResource: changesDescriptor => changesDescriptor.oldResource,
    translationChangeHandler: removeTranslationFromEntity,
    repository: entitiesRepositoryFactory.currentVersion(externalContext.datasetId, externalContext.version)
  });
}

function toApplyTranslationChangesStream(translationsDiffStream, options) {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}) => {
      return options.isApplicable(changesDescriptor);
    })
    .map(({changesDescriptor, context}) => {
      const setsAndDomain = entitiesUtils.getSetsAndDomain(options.getResource(changesDescriptor), context);
      return hi.wrapCallback(applyTranslationChanges)({
        changesDescriptor,
        context: _.extend(setsAndDomain, context),
        translationChangeHandler: options.translationChangeHandler,
        repository: options.repository
      });
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function applyTranslationChanges(options, onTranslationRemoved) {
  const {context, changesDescriptor, translationChangeHandler, repository} = options;

  const fetchTranslatedEntityQuery = {
    domain: context.entityDomain.originId,
    sets: context.entitySetsOriginIds,
    gid: changesDescriptor.gid
  };

  logger.debug('Applied operation: ', translationChangeHandler.name);
  logger.debug({obj: fetchTranslatedEntityQuery});

  return repository.findOneByDomainAndSetsAndGid(fetchTranslatedEntityQuery, (error, foundEntity) => {
    if (error) {
      return onTranslationRemoved(error);
    }

    if (!foundEntity) {
      logger.debug('Translated entity was not found, so there is no need to update translations');
      return onTranslationRemoved(null);
    }

    logger.debug('Translated entity was found. OriginId: ', foundEntity.originId);

    if (!translationChangeHandler) {
      return onTranslationRemoved(null);
    }

    const options = {changesDescriptor, context, foundEntity, fetchTranslatedEntityQuery};
    return translationChangeHandler(options, onTranslationRemoved);
  });
}

function removeTranslationFromEntity(options, onTranslationRemoved) {
  const {changesDescriptor, context, foundEntity} = options;

  const entityRepository = entitiesRepositoryFactory.latestVersion(context.datasetId, context.version);
    logger.debug('Translation will be removed for the next entity: ', foundEntity);

    if (foundEntity.to === context.version) {
      logger.debug('Translated entity was updated in current transaction');
      return entityRepository.removeTranslation({
        entityOriginId: foundEntity.originId,
        language: changesDescriptor.language
      }, onTranslationRemoved);
    }

    return entityRepository.closeOneByQuery({originId: foundEntity.originId}, (error, closedEntity) => {
      if (!closedEntity) {
        return onTranslationRemoved(error);
      }

      logger.debug('Translated entity was closed - new one with translation updated will be created. OriginId:', foundEntity.originId);
      closedEntity.languages = _.omit(closedEntity.languages, changesDescriptor.language);
      const newEntity = entitiesUtils.makeEntityBasedOnItsClosedVersion(closedEntity.properties, closedEntity, context);
      entityRepository.create(newEntity, onTranslationRemoved);
    });
}

function addTranslationToEntity(options, onTranslationAdded) {
  return updateTranslation(options, makeTranslationForCreateAction, onTranslationAdded);
}

function updateTranslationInEntity(options, onTranslationAdded) {
  return updateTranslation(options, makeTranslationForUpdateAction, onTranslationAdded);
}

function updateTranslation(options, makeTranslation, onTranslationAdded) {
  const {changesDescriptor, context, foundEntity, fetchTranslatedEntityQuery} = options;

  const entityRepository = entitiesRepositoryFactory.latestVersion(context.datasetId, context.version);

  const newTranslation = makeTranslation(changesDescriptor, foundEntity);
  if (foundEntity.from === context.version) {
    return entityRepository.addTranslation({
      entityId: foundEntity._id,
      language: changesDescriptor.language,
      translation: newTranslation
    }, onTranslationAdded);
  }

  return entityRepository.closeOneByQuery(fetchTranslatedEntityQuery, (error, closedEntity) => {
    if (!closedEntity) {
      return onTranslationAdded(error);
    }

    closedEntity.languages = _.extend(closedEntity.languages, {[changesDescriptor.language]: newTranslation});
    const newEntity = entitiesUtils.makeEntityBasedOnItsClosedVersion(closedEntity.properties, closedEntity, context);
    entityRepository.create(newEntity, onTranslationAdded);
  });
}

function makeTranslationForCreateAction(changesDescriptor) {
  return changesDescriptor.changes;
}

function makeTranslationForUpdateAction(changesDescriptor, foundEntity) {
  const existingTranslation = _.get(foundEntity.languages, changesDescriptor.language);
  return _.omit(_.extend(existingTranslation, changesDescriptor.changes), changesDescriptor.removedColumns);
}
