import * as _ from 'lodash';
import * as hi from 'highland';
import {logger} from '../../../ws.config/log';
import {constants} from '../../../ws.utils/constants';
import * as fileUtils from '../../../ws.utils/file';
import {ChangesDescriptor} from '../../utils/changes-descriptor';
import * as ddfImportUtils from '../../utils/import-ddf.utils';
import { DatasetTracker } from '../../../ws.services/datasets-tracker';

export {
  createTranslationsUpdater
};

function createTranslationsUpdater(plugin: any, externalContext: any, done: Function): void {
  logger.info('Start translations updating process for:', plugin.dataType);

  const translationsDiffStream = createTranslationsDiffStream(plugin, externalContext);

  // This stream should be duplicated YES! Don't be smart and don't try to substitute with the definition above
  const translationsDiffStreamForRemovals = createTranslationsDiffStream(plugin, externalContext);

  // Streams order is IMPORTANT HERE - DO NOT TOUCH!
  const translationsDiffProcessingStream = hi([
    toRemovedTranslationsStream(translationsDiffStreamForRemovals, plugin, externalContext),
    hi([
      toCreatedTranslationsStream(translationsDiffStream, plugin, externalContext),
      toUpdatedTranslationsStream(translationsDiffStream, plugin, externalContext)
    ]).parallel(2)
  ]).sequence();

  return ddfImportUtils.startStreamProcessing(translationsDiffProcessingStream, externalContext, done);
}

function createTranslationsDiffStream(plugin: any, externalContext: any): void {
  return fileUtils
    .readTextFileByLineAsJsonStream(externalContext.pathToLangDiff)
    .map((changes: ChangesDescriptor) => new ChangesDescriptor(changes))
    .filter((changesDescriptor: ChangesDescriptor) => changesDescriptor.describes(plugin.dataType))
    .through(_.bind(plugin.transformStreamBeforeActionSegregation || _.identity, plugin))
    .map((changesDescriptor: ChangesDescriptor) => ({context: externalContext, changesDescriptor}));
}

function toUpdatedTranslationsStream(translationsDiffStream: any, plugin: any, externalContext: any): void {
  const latestVersionRepository = plugin.repositoryFactory.latestVersion(externalContext.datasetId, externalContext.version);

  const translationApiPlugin = getTranslationApiFromPlugin(plugin);
  const translationApiRepository = getTranslationApiFromRepository(latestVersionRepository);

  const translationApiBase = {
    isApplicable: (changesDescriptor: ChangesDescriptor) => changesDescriptor.isUpdateAction(),
    getResource: (changesDescriptor: ChangesDescriptor) => changesDescriptor.currentResource,
    makeTranslation: makeTranslationForUpdateAction,
    translationChangeHandler: updateTranslation
  };

  const translationsApi = _.extend(translationApiBase, translationApiPlugin, translationApiRepository);
  return toApplyTranslationChangesStream(translationsDiffStream, translationsApi);
}

function toCreatedTranslationsStream(translationsDiffStream: any, plugin: any, externalContext: any): void {
  const latestVersionRepository = plugin.repositoryFactory.latestVersion(externalContext.datasetId, externalContext.version);

  const translationApiPlugin = getTranslationApiFromPlugin(plugin);
  const translationApiRepository = getTranslationApiFromRepository(latestVersionRepository);

  const translationApiBase = {
    isApplicable: (changesDescriptor: ChangesDescriptor) => changesDescriptor.isCreateAction(),
    getResource: (changesDescriptor: ChangesDescriptor) => changesDescriptor.currentResource,
    makeTranslation: makeTranslationForCreateAction,
    translationChangeHandler: updateTranslation
  };

  const translationsApi = _.extend(translationApiBase, translationApiPlugin, translationApiRepository);
  return toApplyTranslationChangesStream(translationsDiffStream, translationsApi);
}

function toRemovedTranslationsStream(translationsDiffStream: any, plugin: any, externalContext: any): void {
  const fetchingRepository = plugin.repositoryFactory.currentVersion(externalContext.datasetId, externalContext.version);
  const updatingRepository = plugin.repositoryFactory.latestVersion(externalContext.datasetId, externalContext.version);

  const translationApiPlugin = getTranslationApiFromPlugin(plugin);
  const translationApiRepository = getTranslationApiFromRepository(fetchingRepository, updatingRepository);

  const translationApiBase = {
    isApplicable: (changesDescriptor: ChangesDescriptor) => changesDescriptor.isRemoveAction(),
    getResource: (changesDescriptor: ChangesDescriptor) => changesDescriptor.oldResource,
    translationChangeHandler: removeTranslationFromTarget
  };

  const translationsApi = _.extend(translationApiBase, translationApiPlugin, translationApiRepository);
  return toApplyTranslationChangesStream(translationsDiffStream, translationsApi);
}

function toApplyTranslationChangesStream(translationsDiffStream: any, translationsApi: any): any {
  return translationsDiffStream.fork()
    .filter(({changesDescriptor}: any) => {
      return translationsApi.isApplicable(changesDescriptor);
    })
    .map(({changesDescriptor, context}: any) => {
      const resource = translationsApi.getResource(changesDescriptor);
      const additionsToContext = translationsApi.enrichContext(resource, changesDescriptor, context);
      const enrichedContext = _.extend(additionsToContext, context);
      return {changesDescriptor, context: enrichedContext};
    })
    .through(translationsApi.transformStreamBeforeChangesApplied)
    .map((changesAndContext: any) => {
      DatasetTracker
        .get(changesAndContext.context.datasetName)
        .increment(constants.TRANSLATIONS, 1);
      return hi.wrapCallback(applyTranslationChanges)(changesAndContext, translationsApi);
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);
}

function applyTranslationChanges({changesDescriptor, context}: any, translationsApi: any, onChangesApplied: Function): any {
  const fetchTranslationTargetQuery = translationsApi.makeQueryToFetchTranslationTarget(changesDescriptor, context);

  logger.debug('Applied operation: ', translationsApi.translationChangeHandler.name);
  logger.debug({obj: fetchTranslationTargetQuery});

  return translationsApi.findTargetForTranslation(fetchTranslationTargetQuery, (error: string, foundTarget: any) => {
    if (error) {
      return onChangesApplied(error);
    }

    if (!foundTarget) {
      logger.debug('Translation target was not found (probably target was closed in this update), hence no updates to translations');
      return onChangesApplied(null);
    }

    logger.debug('Translation target was found. OriginId: ', foundTarget.originId);

    const options = {changesDescriptor, context, foundTarget, fetchTranslationTargetQuery};

    return translationsApi.translationChangeHandler(translationsApi, options, onChangesApplied);
  });
}

function removeTranslationFromTarget(translationsApi: any, options: any, onTranslationRemoved: Function): void {
  const {changesDescriptor, context, foundTarget} = options;

  logger.debug('Translation will be removed for the next target: ', foundTarget);

  if (foundTarget.to === context.version) {
    logger.debug('Translation target was updated in current transaction');
    return translationsApi.removeTranslation({
      originId: foundTarget.originId,
      language: changesDescriptor.language
    }, onTranslationRemoved);
  }

  return translationsApi.closeOneByQuery({originId: foundTarget.originId}, (error: string, closedTarget: any) => {
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

function updateTranslation(translationsApi: any, options: any, onTranslationAdded: Function): void {
  const {changesDescriptor, context, foundTarget, fetchTranslationTargetQuery} = options;

  const newTranslation = translationsApi.makeTranslation(changesDescriptor, foundTarget);
  const processedTranslation = translationsApi.processTranslationBeforeUpdate(newTranslation, context);

  if (foundTarget.from === context.version) {
    return translationsApi.addTranslation({
      id: foundTarget._id,
      language: changesDescriptor.language,
      translation: processedTranslation
    }, onTranslationAdded);
  }

  return translationsApi.closeOneByQuery(fetchTranslationTargetQuery, (error: string, closedTarget: any) => {
    if (error) {
      return onTranslationAdded(error);
    }

    if (!closedTarget) {
      logger.warn('Translation target was not closed - VERY suspicious at this point of translations update flow!');
      return onTranslationAdded(null);
    }

    closedTarget.languages = _.extend(closedTarget.languages, {[changesDescriptor.language]: processedTranslation});
    const newTarget = translationsApi.makeTranslationTargetBasedOnItsClosedVersion(closedTarget, context);

    translationsApi.create(newTarget, onTranslationAdded);
  });
}

function makeTranslationForCreateAction(changesDescriptor: ChangesDescriptor): void {
  return changesDescriptor.changes;
}

function makeTranslationForUpdateAction(changesDescriptor: ChangesDescriptor, foundTarget: any): void {
  return _.chain(foundTarget.languages)
    .get<any>(changesDescriptor.language)
    .omit(changesDescriptor.removedColumns)
    .extend(changesDescriptor.changes)
    .value();
}

function getTranslationApiFromRepository(fetchingRepository: any, updatingRepository: any = fetchingRepository): any {
  return {
    findTargetForTranslation: _.bind(fetchingRepository.findTargetForTranslation, fetchingRepository),
    create: _.bind(updatingRepository.create, updatingRepository),
    removeTranslation: _.bind(updatingRepository.removeTranslation, updatingRepository),
    addTranslation: _.bind(updatingRepository.addTranslation, updatingRepository),
    closeOneByQuery: _.bind(updatingRepository.closeOneByQuery, updatingRepository)
  };
}

function getTranslationApiFromPlugin(plugin: any): any {
  return {
    transformStreamBeforeChangesApplied: _.bind(plugin.transformStreamBeforeChangesApplied || _.identity, plugin),
    enrichContext: _.bind(plugin.enrichContext || _.noop, plugin),
    processTranslationBeforeUpdate: _.bind(plugin.processTranslationBeforeUpdate || _.identity, plugin),
    makeQueryToFetchTranslationTarget: _.bind(plugin.makeQueryToFetchTranslationTarget, plugin),
    makeTranslationTargetBasedOnItsClosedVersion: _.bind(plugin.makeTranslationTargetBasedOnItsClosedVersion, plugin)
  };
}
