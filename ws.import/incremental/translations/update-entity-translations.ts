import { constants } from '../../../ws.utils/constants';
import * as ddfMappers from '../../utils/ddf-mappers';
import * as entitiesUtils from '../../utils/entities.utils';
import * as _ from 'lodash';
import { createTranslationsUpdater } from './update-translations-flow';
import { EntitiesRepositoryFactory } from '../../../ws.repository/ddf/entities/entities.repository';
import {ChangesDescriptor} from '../../utils/changes-descriptor';

export {
  updateEntitiesTranslation
};

function updateEntitiesTranslation(externalContext: any, done: Function): void {

  const externalContextFrozen = Object.freeze({
    datasetId: externalContext.dataset._id,
    version: externalContext.transaction.createdAt,
    pathToLangDiff: externalContext.pathToLangDiff,
    concepts: externalContext.concepts,
    previousConcepts: externalContext.previousConcepts
  });

  const plugin = {
    dataType: constants.ENTITIES,
    enrichContext,
    repositoryFactory: EntitiesRepositoryFactory,
    makeTranslationTargetBasedOnItsClosedVersion,
    processTranslationBeforeUpdate,
    makeQueryToFetchTranslationTarget
  };

  return createTranslationsUpdater(plugin, externalContextFrozen, (error: string) => {
    done(error, externalContext);
  });
}

function enrichContext(resource: any, changesDescriptor: ChangesDescriptor, externalContext: any): any {
  const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, externalContext, changesDescriptor.changedObject);
  return _.extend(setsAndDomain, {filename: resource.path});
}

function makeQueryToFetchTranslationTarget(changesDescriptor: ChangesDescriptor, context: any): any {
  return {
    domain: context.entityDomain.originId,
    sets: context.entitySetsOriginIds,
    gid: changesDescriptor.gid,
    sources: context.filename
  };
}

function makeTranslationTargetBasedOnItsClosedVersion(closedTarget: any, context: any): any {
  return entitiesUtils.makeEntityBasedOnItsClosedVersion(closedTarget.properties, closedTarget, context);
}

function processTranslationBeforeUpdate(translation: any, context: any): any {
  return ddfMappers.transformEntityProperties(translation, context.concepts);
}
