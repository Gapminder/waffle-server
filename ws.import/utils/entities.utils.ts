import * as _ from 'lodash';
import * as ddfMappers from './ddf-mappers';
import {constants} from '../../ws.utils/constants';

export {
  getSetsAndDomain,
  makeEntityBasedOnItsClosedVersion,
  getAllSetsAndDomain
};

function getSetsAndDomain(resource: any, context: any, entity: any): any {
  return getSetsAndDomainFunctionality(resource, context, entity, true);
}

function getAllSetsAndDomain(resource: any, context: any): any {
  return getSetsAndDomainFunctionality(resource, context);
}

function getSetsAndDomainFunctionality(resource: any, context: any, entity: any = null, shouldCheckValue: boolean = false): any {
  const entitySet = context.concepts[resource.concept] || context.previousConcepts[resource.concept];
  const entityDomain = entitySet.type === 'entity_domain' ? entitySet : entitySet.domain;

  const entitySets = _.reduce(resource.entitySets, (sets: any, set: string) => {
    if ((shouldCheckValue && _.toUpper(_.toString(entity[`${constants.IS_OPERATOR}${set}`])) === 'TRUE') || !shouldCheckValue) {
      const concept = context.concepts[set] || context.previousConcepts[set];
      return _.extend(sets, {[set]: concept.originId});
    }
    return sets;
  }, {});

  return {entitySet, entityDomain, entitySetsOriginIds: _.values(entitySets)};
}

function makeEntityBasedOnItsClosedVersion(properties: any, closedEntity: any, externalContext: any): any {
  const {
    entitySet,
    concepts,
    entityDomain,
    filename,
    timeConcepts,
    version,
    datasetId
  } = externalContext;

  const context = {
    entitySet,
    concepts,
    entityDomain,
    filename,
    timeConcepts,
    version,
    datasetId,
    entitySetsOriginIds: externalContext.entitySetsOriginIds,
    originId: closedEntity.originId,
    sources: closedEntity.sources,
    languages: closedEntity.languages
  };

  return ddfMappers.mapDdfEntityToWsModel(properties, context);
}
