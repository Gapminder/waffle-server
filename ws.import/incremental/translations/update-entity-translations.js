'use strict';

const constants = require('../../../ws.utils/constants');
const ddfMappers = require('../../utils/ddf-mappers');
const entitiesUtils = require('../../utils/entities.utils');
const updateTranslations = require('./update-translations-flow');
const entitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');

module.exports = (externalContext, done) => {

  const externalContextFrozen = Object.freeze({
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt,
    pathToLangDiff: externalContext.pathToLangDiff,
    concepts: externalContext.concepts,
    previousConcepts: externalContext.previousConcepts,
  });

  const plugin = {
    dataType: constants.ENTITIES,
    enrichContext,
    repositoryFactory: entitiesRepositoryFactory,
    makeTranslationTargetBasedOnItsClosedVersion,
    processTranslationBeforeUpdate,
    makeQueryToFetchTranslationTarget
  };

  return updateTranslations(plugin, externalContextFrozen, error => {
    done(error, externalContext);
  });
};

function enrichContext(resource, changesDescriptor, externalContext) {
  return entitiesUtils.getSetsAndDomain(resource, externalContext, externalContext);
}

function makeQueryToFetchTranslationTarget(changesDescriptor, context) {
  return {
    domain: context.entityDomain.originId,
    sets: context.entitySetsOriginIds,
    gid: changesDescriptor.gid
  };
}

function makeTranslationTargetBasedOnItsClosedVersion(closedTarget, context) {
  return entitiesUtils.makeEntityBasedOnItsClosedVersion(closedTarget.properties, closedTarget, context);
}

function processTranslationBeforeUpdate(translation) {
  return ddfMappers.transformEntityTranslation(translation);
}
