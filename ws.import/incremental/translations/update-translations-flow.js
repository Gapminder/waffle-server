'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');
const async = require('async');
const logger = require('../../../ws.config/log');
const constants = require('../../../ws.utils/constants');
const ChangesDescriptor = require('../../utils/changes-descriptor').ChangesDescriptor;
const ddfImportUtils = require('../../utils/import-ddf.utils');

module.exports = createTranslationsUpdater;

function createTranslationsUpdater(plugin, externalContext, done) {
  logger.info('Start translations updating process for:', plugin.dataType);

  const translationsDiffStream = createTranslationsDiffStream(plugin.dataType, externalContext);

  //This stream should be duplicated YES! Don't be smart and don't try to substitute with the definition above
  const translationsDiffStreamForRemovals = createTranslationsDiffStream(plugin.dataType, externalContext);

  //Streams order is IMPORTANT HERE - DO NOT TOUCH!
  const translationsDiffProcessingStream = hi([
    toRemovedTranslationsStream(translationsDiffStreamForRemovals, plugin, externalContext),
    hi([
      toCreatedTranslationsStream(translationsDiffStream, plugin, externalContext),
      toUpdatedTranslationsStream(translationsDiffStream, plugin, externalContext)
    ]).parallel(2)
  ]).sequence();

  return ddfImportUtils.startStreamProcessing(translationsDiffProcessingStream, externalContext, done);
}

function createTranslationsDiffStream(dataType, externalContext) {
  return ddfImportUtils
    .readTextFileByLineAsJsonStream(externalContext.pathToLangDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(dataType))
    .map(changesDescriptor => ({context: externalContext, changesDescriptor}));
}

function toUpdatedTranslationsStream(translationsDiffStream, plugin, externalContext) {
  const latestVersionRepository = plugin.repositoryFactory.latestVersion(externalContext.datasetId, externalContext.version);

  const translationApiPlugin = getTranslationApiFromPlugin(plugin);
  const translationApiRepository = getTranslationApiFromRepository(latestVersionRepository);

  const translationApiBase = {
    isApplicable: changesDescriptor => changesDescriptor.isUpdateAction(),
    getResource: changesDescriptor => changesDescriptor.currentResource,
    makeTranslation: makeTranslationForUpdateAction,
    translationChangeHandler: updateTranslation
  };

  const translationsApi = _.extend(translationApiBase, translationApiPlugin, translationApiRepository);
  return toApplyTranslationChangesStream(translationsDiffStream, translationsApi);
}

function toCreatedTranslationsStream(translationsDiffStream, plugin, externalContext) {
  const latestVersionRepository = plugin.repositoryFactory.latestVersion(externalContext.datasetId, externalContext.version);

  const translationApiPlugin = getTranslationApiFromPlugin(plugin);
  const translationApiRepository = getTranslationApiFromRepository(latestVersionRepository);

  const translationApiBase = {
    isApplicable: changesDescriptor => changesDescriptor.isCreateAction(),
    getResource: changesDescriptor => changesDescriptor.currentResource,
    makeTranslation: makeTranslationForCreateAction,
    translationChangeHandler: updateTranslation
  };

  const translationsApi = _.extend(translationApiBase, translationApiPlugin, translationApiRepository);
  return toApplyTranslationChangesStream(translationsDiffStream, translationsApi);
}

function toRemovedTranslationsStream(translationsDiffStream, plugin, externalContext) {
  const fetchingRepository = plugin.repositoryFactory.currentVersion(externalContext.datasetId, externalContext.version);
  const updatingRepository = plugin.repositoryFactory.latestVersion(externalContext.datasetId, externalContext.version);

  const translationApiPlugin = getTranslationApiFromPlugin(plugin);
  const translationApiRepository = getTranslationApiFromRepository(fetchingRepository, updatingRepository);

  const translationApiBase = {
    isApplicable: changesDescriptor => changesDescriptor.isRemoveAction(),
    getResource: changesDescriptor => changesDescriptor.oldResource,
    translationChangeHandler: removeTranslationFromTarget,
  };

  const translationsApi = _.extend(translationApiBase, translationApiPlugin, translationApiRepository);
  return toApplyTranslationChangesStream(translationsDiffStream, translationsApi);
}

function toApplyTranslationChangesStream(translationsDiffStream, translationsApi) {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}) => {
      return translationsApi.isApplicable(changesDescriptor);
    })
    .map(({changesDescriptor, context}) => {
      const resource = translationsApi.getResource(changesDescriptor);
      const additionsToContext = translationsApi.enrichContext(resource, changesDescriptor, context);
      const enrichedContext = _.extend(additionsToContext, context);
      return {changesDescriptor, context: enrichedContext};
    })
    .map(changesAndContext => {
      return hi.wrapCallback(applyTranslationChanges)(changesAndContext, translationsApi);
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function applyTranslationChanges({changesDescriptor, context}, translationsApi, onChangesApplied) {
  const fetchTranslationTargetQuery = translationsApi.makeQueryToFetchTranslationTarget(changesDescriptor, context);

  logger.debug('Applied operation: ', translationsApi.translationChangeHandler.name);
  logger.debug({obj: fetchTranslationTargetQuery});

  return translationsApi.findTargetForTranslation(fetchTranslationTargetQuery, (error, foundTarget) => {
    if (error) {
      return onChangesApplied(error);
    }

    if (!foundTarget) {
      logger.debug('Translation target was not found, so there is no need to update translations');
      return onChangesApplied(null);
    }

    logger.debug('Translation target was found. OriginId: ', foundTarget.originId);

    if (!translationsApi.translationChangeHandler) {
      return onChangesApplied(null);
    }

    const options = {changesDescriptor, context, foundTarget, fetchTranslationTargetQuery};
    return translationsApi.translationChangeHandler(translationsApi, options, onChangesApplied);
  });
}

function removeTranslationFromTarget(translationsApi, options, onTranslationRemoved) {
  const {changesDescriptor, context, foundTarget} = options;

  logger.debug('Translation will be removed for the next target: ', foundTarget);

  if (foundTarget.to === context.version) {
    logger.debug('Translation target was updated in current transaction');
    return translationsApi.removeTranslation({
      entityOriginId: foundTarget.originId,
      language: changesDescriptor.language
    }, onTranslationRemoved);
  }

  return translationsApi.closeOneByQuery({originId: foundTarget.originId}, (error, closedTarget) => {
    if (error) {
      return onTranslationRemoved(error);
    }

    if (!closedTarget) {
      logger.warn('Translation target was not closed - VERY suspicious at this point of translations update flow!');
      return onTranslationRemoved(null);
    }

    logger.debug('Translation target was closed - new one with translation updated will be created. OriginId:', foundTarget.originId);

    closedTarget.languages = _.omit(closedTarget.languages, changesDescriptor.language);
    const newTarget = translationsApi.makeTranslationTargetBasedOnItsClosedVersion(closedTarget, context);

    translationsApi.create(newTarget, onTranslationRemoved);
  });
}

function updateTranslation(translationsApi, options, onTranslationAdded) {
  const {changesDescriptor, context, foundTarget, fetchTranslationTargetQuery} = options;

  const newTranslation = translationsApi.makeTranslation(changesDescriptor, foundTarget);
  const processedTranslation = translationsApi.processTranslationBeforeUpdate(newTranslation);

  if (foundTarget.from === context.version) {
    return translationsApi.addTranslation({
      id: foundTarget._id,
      language: changesDescriptor.language,
      translation: processedTranslation
    }, onTranslationAdded);
  }

  return translationsApi.closeOneByQuery(fetchTranslationTargetQuery, (error, closedTarget) => {
    if (error) {
      return onTranslationAdded(error);
    }

    if (!closedTarget) {
      logger.warn('Translation target was not closed - VERY suspicious at this point of translations update flow!');
      return onTranslationAdded(null);
    }

    closedTarget.languages = _.extend(closedTarget.languages, {[changesDescriptor.language]: processedTranslation});
    const newEntity = translationsApi.makeTranslationTargetBasedOnItsClosedVersion(closedTarget, context);

    translationsApi.create(newEntity, onTranslationAdded);
  });
}

function makeTranslationForCreateAction(changesDescriptor) {
  return changesDescriptor.changes;
}

function makeTranslationForUpdateAction(changesDescriptor, foundTarget) {
  return _.chain(foundTarget.languages)
    .get(changesDescriptor.language)
    .extend(changesDescriptor.changes)
    .omit(changesDescriptor.removedColumns)
    .value();
}

function getTranslationApiFromRepository(fetchingRepository, updatingRepository = fetchingRepository) {
  return {
    findTargetForTranslation: _.bind(fetchingRepository.findTargetForTranslation, fetchingRepository),
    create: _.bind(updatingRepository.create, updatingRepository),
    removeTranslation: _.bind(updatingRepository.removeTranslation, updatingRepository),
    addTranslation: _.bind(updatingRepository.addTranslation, updatingRepository),
    closeOneByQuery: _.bind(updatingRepository.closeOneByQuery, updatingRepository)
  };
}

function getTranslationApiFromPlugin(plugin) {
  return {
    enrichContext: _.bind((plugin.enrichContext || _.noop), plugin),
    processTranslationBeforeUpdate: _.bind((plugin.processTranslationBeforeUpdate || _.identity), plugin),
    makeQueryToFetchTranslationTarget: _.bind(plugin.makeQueryToFetchTranslationTarget, plugin),
    makeTranslationTargetBasedOnItsClosedVersion: _.bind(plugin.makeTranslationTargetBasedOnItsClosedVersion, plugin)
  };
}
