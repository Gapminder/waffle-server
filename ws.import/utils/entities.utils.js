'use strict';

const _ = require('lodash');
const ddfMappers = require('./ddf-mappers');

module.exports = {
  getSetsAndDomain,
  makeEntityBasedOnItsClosedVersion
};

function getSetsAndDomain(resource, context) {
  const entitySet = context.concepts[resource.concept] || context.previousConcepts[resource.concept];
  const entityDomain = entitySet.type === 'entity_domain' ? entitySet : entitySet.domain;

  const entitySetsOriginIds = _.map(resource.entitySets, set => {
    const concept = context.concepts[set] || context.previousConcepts[set];
    return concept.originId;
  });

  return {entitySet, entityDomain, entitySetsOriginIds};
}

function makeEntityBasedOnItsClosedVersion(properties, closedEntity, externalContext) {
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
    originId: closedEntity.originId,
    sources: closedEntity.sources,
    languages: closedEntity.languages
  };

  return ddfMappers.mapDdfEntityToWsModel(properties, context);
}
