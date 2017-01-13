import {constants} from '../../../ws.utils/constants';
import * as ddfMappers from '../../utils/ddf-mappers';
import * as entitiesUtils from '../../utils/entities.utils';
import {createTranslationsUpdater} from './update-translations-flow';
import {EntitiesRepositoryFactory} from '../../../ws.repository/ddf/entities/entities.repository';

export {
  updateEntitiesTranslation
};

function updateEntitiesTranslation(externalContext, done) {

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
    repositoryFactory: EntitiesRepositoryFactory,
    makeTranslationTargetBasedOnItsClosedVersion,
    processTranslationBeforeUpdate,
    makeQueryToFetchTranslationTarget
  };

  return createTranslationsUpdater(plugin, externalContextFrozen, error => {
    done(error, externalContext);
  });
}

function enrichContext(resource, changesDescriptor, externalContext) {
  return entitiesUtils.getSetsAndDomain(resource, externalContext);
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

function processTranslationBeforeUpdate(translation, context) {
  return ddfMappers.transformEntityProperties(translation, context.concepts);
}
