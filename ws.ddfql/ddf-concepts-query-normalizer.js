'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const ddfQueryUtils = require("./ddf-query-utils");

module.exports = {
  normalizeConcepts
};

function normalizeConcepts(query, concepts) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];
  normalizeConceptDdfQuery(safeQuery, safeConcepts);
  return safeQuery;
}

function normalizeConceptDdfQuery(query, concepts) {
  normalizeWhere(query, concepts);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query, concepts) {
  const resolvedProperties = _.chain(concepts)
    .map('gid')
    .concat(['concept', 'concept_type'])
    .sort()
    .value();

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isConceptPropertyFilter(this.key, resolvedProperties)) {
      normalizedFilter = {
        [`properties.${this.key}`]: filterValue,
      };
    }

    if (normalizedFilter) {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.where
      });
    }
  });
}

function isConceptPropertyFilter(key, resolvedProperties) {
  const normalizedKey = _.chain(key).split('.').first().value();
  return _.includes(resolvedProperties, normalizedKey);
}
