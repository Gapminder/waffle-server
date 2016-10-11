'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const ddfQueryUtils = require("./ddf-query-utils");
const constants = require("../ws.utils/constants");

module.exports = {
  normalizeConcepts
};

function normalizeConcepts(query, concepts) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];
  const conceptGids = ddfQueryUtils.getConceptGids(safeConcepts);
  const domainGids = ddfQueryUtils.getDomainGids(safeConcepts);
  const options = Object.freeze({
    concepts: safeConcepts,
    conceptGids,
    domainGids
  });
  normalizeConceptDdfQuery(safeQuery, options);
  return safeQuery;
}

function normalizeConceptDdfQuery(query, options) {
  normalizeWhere(query, options);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query, options) {
  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isConceptPropertyFilter(this.key, options.conceptGids)) {
      normalizedFilter = {
        [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue,
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
