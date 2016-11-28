'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const async = require('async');
const logger = require('../../ws.config/log');
const constants = require('../../ws.utils/constants');
const ChangesDescriptor = require('../utils/changes-descriptor').ChangesDescriptor;
const ddfMappers = require('../utils/ddf-mappers');
const ddfImportUtils = require('../utils/import-ddf.utils');
const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');

module.exports = startTranslationsUpdate;

function startTranslationsUpdate(externalContext, done) {
  logger.info('Start translations updating process');

  const externalContextFrozen = Object.freeze({
    pathToLangDiff: externalContext.pathToLangDiff,
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt
  });

  const createTranslationsDiffStream = () => ddfImportUtils
    .readTextFileByLineAsJsonStream(externalContextFrozen.pathToLangDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.CONCEPTS))
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
    translationChangeHandler: updateTranslationInConcept,
    repository: conceptsRepositoryFactory.latestVersion(externalContext.datasetId, externalContext.version)
  });
}

function toCreatedTranslationsStream(translationsDiffStream, externalContext) {
  return toApplyTranslationChangesStream(translationsDiffStream, {
    isApplicable: changesDescriptor => changesDescriptor.isCreateAction(),
    getResource: changesDescriptor => changesDescriptor.currentResource,
    translationChangeHandler: addTranslationToConcept,
    repository: conceptsRepositoryFactory.latestVersion(externalContext.datasetId, externalContext.version)
  });
}

function toRemovedTranslationsStream(translationsDiffStream, externalContext) {
  return toApplyTranslationChangesStream(translationsDiffStream, {
    isApplicable: changesDescriptor => changesDescriptor.isRemoveAction(),
    getResource: changesDescriptor => changesDescriptor.oldResource,
    translationChangeHandler: removeTranslationFromConcept,
    repository: conceptsRepositoryFactory.currentVersion(externalContext.datasetId, externalContext.version)
  });
}

function toApplyTranslationChangesStream(translationsDiffStream, options) {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}) => {
      return options.isApplicable(changesDescriptor);
    })
    .map(({changesDescriptor, context}) => {
      return hi.wrapCallback(applyTranslationChanges)({
        changesDescriptor,
        context,
        translationChangeHandler: options.translationChangeHandler,
        repository: options.repository
      });
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function applyTranslationChanges(options, onTranslationRemoved) {
  const {context, changesDescriptor, translationChangeHandler, repository} = options;

  const fetchTranslationTargetQuery = {
    gid: changesDescriptor.gid
  };

  logger.debug('Applied operation: ', translationChangeHandler.name);
  logger.debug({obj: fetchTranslationTargetQuery});

  return repository.findByGid(fetchTranslationTargetQuery.gid, (error, foundTranslationTarget) => {
    if (error) {
      return onTranslationRemoved(error);
    }

    if (!foundTranslationTarget) {
      logger.debug('Translated concept was not found, so there is no need to update translations');
      return onTranslationRemoved(null);
    }

    logger.debug('Translated concept was found. OriginId: ', foundTranslationTarget.originId);

    if (!translationChangeHandler) {
      return onTranslationRemoved(null);
    }

    const options = {changesDescriptor, context, foundTranslationTarget, fetchTranslationTargetQuery};
    return translationChangeHandler(options, onTranslationRemoved);
  });
}

function removeTranslationFromConcept(options, onTranslationRemoved) {
  const {changesDescriptor, context, foundTranslationTarget} = options;

  const conceptsRepository = conceptsRepositoryFactory.latestVersion(context.datasetId, context.version);
  logger.debug('Translation will be removed for the next concept: ', foundTranslationTarget);

  if (foundTranslationTarget.to === context.version) {
    logger.debug('Translated concept was updated in current transaction');
    return conceptsRepository.removeTranslation({
      originId: foundTranslationTarget.originId,
      language: changesDescriptor.language
    }, onTranslationRemoved);
  }

  return conceptsRepository.closeOneByQuery({originId: foundTranslationTarget.originId}, (error, closedTarget) => {
    if (!closedTarget) {
      return onTranslationRemoved(error);
    }

    logger.debug('Translated concept was closed - new one with translation updated will be created. OriginId:', foundTranslationTarget.originId);
    closedTarget.languages = _.omit(closedTarget.languages, changesDescriptor.language);

    const newConcept = ddfMappers.mapDdfConceptsToWsModel(closedTarget.properties, _.extend(context, {
      domain: closedTarget.domain,
      languages: closedTarget.languages
    }));

    conceptsRepository.create(newConcept, onTranslationRemoved);
  });
}

function addTranslationToConcept(options, onTranslationAdded) {
  return updateTranslation(options, makeTranslationForCreateAction, onTranslationAdded);
}

function updateTranslationInConcept(options, onTranslationAdded) {
  return updateTranslation(options, makeTranslationForUpdateAction, onTranslationAdded);
}

function updateTranslation(options, makeTranslation, onTranslationAdded) {
  const {changesDescriptor, context, foundTranslationTarget, fetchTranslationTargetQuery} = options;

  const conceptsRepository = conceptsRepositoryFactory.latestVersion(context.datasetId, context.version);

  const newTranslation = makeTranslation(changesDescriptor, foundTranslationTarget);
  if (foundTranslationTarget.from === context.version) {
    return conceptsRepository.addTranslation({
      id: foundTranslationTarget._id,
      language: changesDescriptor.language,
      translation: newTranslation
    }, onTranslationAdded);
  }

  return conceptsRepository.closeOneByQuery(fetchTranslationTargetQuery, (error, closedTarget) => {
    if (!closedTarget) {
      return onTranslationAdded(error);
    }

    closedTarget.languages = _.extend(closedTarget.languages, {[changesDescriptor.language]: newTranslation});

    const newConcept = ddfMappers.mapDdfConceptsToWsModel(closedTarget.properties, _.extend(context, {
      languages: closedTarget.languages,
      domain: closedTarget.domain
    }));

    conceptsRepository.create(newConcept, onTranslationAdded);
  });
}

function makeTranslationForCreateAction(changesDescriptor) {
  return changesDescriptor.changes;
}

function makeTranslationForUpdateAction(changesDescriptor, translationTarget) {
  const existingTranslation = _.get(translationTarget.languages, changesDescriptor.language);
  return _.omit(_.extend(existingTranslation, changesDescriptor.changes), changesDescriptor.removedColumns);
}
