'use strict';

const _ = require('lodash');
const constants = require('../../../ws.utils/constants');
const ddfMappers = require('../../utils/ddf-mappers');
const updateTranslations = require('./update-translations-flow');
const conceptsRepositoryFactory = require('../../../ws.repository/ddf/concepts/concepts.repository');

module.exports = (externalContext, done) => {

  const externalContextFrozen = Object.freeze({
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt,
    pathToLangDiff: externalContext.pathToLangDiff,
  });

  const plugin = {
    dataType: constants.CONCEPTS,
    repositoryFactory: conceptsRepositoryFactory,
    makeTranslationTargetBasedOnItsClosedVersion,
    processTranslationBeforeUpdate,
    makeQueryToFetchTranslationTarget
  };

  return updateTranslations(plugin, externalContextFrozen, error => {
    done(error, externalContext);
  });
};

function makeQueryToFetchTranslationTarget(changesDescriptor, context) {
  return {
    gid: changesDescriptor.gid
  };
}

function makeTranslationTargetBasedOnItsClosedVersion(closedTarget, context) {
  return ddfMappers.mapDdfConceptsToWsModel(closedTarget.properties, _.extend({
    domain: closedTarget.domain,
    languages: closedTarget.languages,
    originId: closedTarget.originId
  }, context));
}

function processTranslationBeforeUpdate(translation) {
  return ddfMappers.transformConceptTranslation(translation);
}
