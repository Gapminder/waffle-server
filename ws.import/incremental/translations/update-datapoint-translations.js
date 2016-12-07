'use strict';

const _ = require('lodash');
const hi = require('highland');
const constants = require('../../../ws.utils/constants');
const logger = require('../../../ws.config/log');
const datapointsUtils = require('../../utils/datapoints.utils');
const ChangesDescriptor = require('../../utils/changes-descriptor').ChangesDescriptor;
const updateTranslations = require('./update-translations-flow');
const datapointsRepositoryFactory = require('../../../ws.repository/ddf/data-points/data-points.repository');

module.exports = (externalContext, done) => {

  const plugin = {
    dataType: constants.DATAPOINTS,
    enrichContext,
    repositoryFactory: datapointsRepositoryFactory,
    makeTranslationTargetBasedOnItsClosedVersion,
    makeQueryToFetchTranslationTarget,
    transformStreamBeforeChangesApplied,
    transformStreamBeforeActionSegregation
  };

  const segregatedEntitiesPromise = datapointsUtils.findAllEntities(externalContext)
    .then(segregatedEntities => ({segregatedEntities}));

  const segregatedPreviousEntitiesPromise = datapointsUtils.findAllPreviousEntities(externalContext)
    .then(segregatedPreviousEntities => ({segregatedPreviousEntities}));

  Promise.all([segregatedEntitiesPromise, segregatedPreviousEntitiesPromise])
    .then(result => _.extend({}, _.first(result), _.last(result)))
    .then(previousAndCurrentSegregatedEntities => {

      const externalContextFrozen = Object.freeze(_.extend({
        datasetId: externalContext.dataset._id,
        version: externalContext.transaction.createdAt,
        dataset: externalContext.dataset,
        transaction: externalContext.transaction,
        previousTransaction: externalContext.previousTransaction,
        pathToLangDiff: externalContext.pathToLangDiff,
        concepts: externalContext.concepts,
        previousConcepts: externalContext.previousConcepts,
      }, previousAndCurrentSegregatedEntities));

      return updateTranslations(plugin, externalContextFrozen, error => {
        done(error, externalContext);
      });
    });
};

function enrichContext(resource, changesDescriptor, externalContext) {
  return datapointsUtils.getDimensionsAndMeasures(resource, externalContext);
}

function transformStreamBeforeActionSegregation(changesStream) {
  return changesStream
    .flatMap(changesDescriptorForUpdate => {
      if (changesDescriptorForUpdate.isUpdateAction() && !_.isEmpty(changesDescriptorForUpdate.removedColumns)) {
        const descriptors = _makeChangesDescriptorsForRemoveFrom(changesDescriptorForUpdate);
        if (!changesDescriptorForUpdate.onlyColumnsRemoved) {
          descriptors.push(changesDescriptorForUpdate);
        }
        return hi(descriptors);
      }

      return hi.of(changesDescriptorForUpdate);
    });
}

function transformStreamBeforeChangesApplied(changesStream) {
  return changesStream
    .flatMap(({changesDescriptor, context}) => {
      const changesInDatapoint = changesDescriptor.changes;

      // each ChangesDescriptor should carry changes only for single indicator
      const datapointChangesDescriptorPerIndicator = _.reduce(context.measures, (result, indicator) => {

        // we should care only about indicators that were updated
        if (_.has(changesInDatapoint, indicator.gid)) {
          result.push({changesDescriptor, context: _.extend({indicator}, context)});
        }

        return result;
      }, []);

      return hi(datapointChangesDescriptorPerIndicator);
    });
}

function makeQueryToFetchTranslationTarget(changesDescriptor, externalContext) {
  const indicatorOriginId = _.get(externalContext.indicator, 'originId');

  if(!indicatorOriginId) {
    logger.error('Measure was not found! ChangesDescriptor internals are: ', changesDescriptor.changes);
  }

  const dimensionsEntityOriginIds = datapointsUtils.getDimensionsAsEntityOriginIds(changesDescriptor.changes, externalContext);

  return {
    measureOriginId: indicatorOriginId,
    dimensionsSize: _.size(externalContext.dimensions),
    dimensionsEntityOriginIds,
  };
}

function makeTranslationTargetBasedOnItsClosedVersion(closedTarget, externalContext) {
  closedTarget.from = externalContext.version;
  closedTarget.to = constants.MAX_VERSION;
  return _.omit(closedTarget, constants.MONGO_SPECIAL_FIELDS);
}

function _makeChangesDescriptorsForRemoveFrom(changesDescriptor) {
  const original = changesDescriptor.original;
  const language = changesDescriptor.language;
  const oldResource = changesDescriptor.oldResource;

  return _.reduce(changesDescriptor.removedColumns, (descriptors, removedColumn) => {
    if (_.includes(oldResource.indicators, removedColumn)) {
      const changes = {
        object: _.pick(original, [removedColumn, ...oldResource.dimensions]),
        metadata: {
          file: {
            old: changesDescriptor.oldResourceRaw
          },
          action: ChangesDescriptor.REMOVE_ACTION_NAME,
          lang: language,
          type: constants.DATAPOINTS
        }
      };

      descriptors.push(new ChangesDescriptor(changes));
    }
    return descriptors;
  }, []);
}
