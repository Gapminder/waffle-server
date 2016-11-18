'use strict';

const _ = require('lodash');

module.exports = {
  getSetsAndDomain
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
