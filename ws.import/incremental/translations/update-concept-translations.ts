import * as _ from 'lodash';
import { constants } from '../../../ws.utils/constants';
import * as ddfMappers from '../../utils/ddf-mappers';
import {createTranslationsUpdater} from './update-translations-flow';
import { ConceptsRepositoryFactory } from '../../../ws.repository/ddf/concepts/concepts.repository';

export {
  updateConceptsTranslations
};

function updateConceptsTranslations(externalContext, done) {

  const externalContextFrozen = Object.freeze({
    transaction: externalContext.transaction,
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt,
    pathToLangDiff: externalContext.pathToLangDiff,
  });

  const plugin = {
    dataType: constants.CONCEPTS,
    repositoryFactory: ConceptsRepositoryFactory,
    makeTranslationTargetBasedOnItsClosedVersion,
    processTranslationBeforeUpdate,
    makeQueryToFetchTranslationTarget
  };

  return createTranslationsUpdater(plugin, externalContextFrozen, error => {
    done(error, externalContext);
  });
}

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
  return ddfMappers.transformConceptProperties(translation);
}
