import * as _ from 'lodash';
import * as traverse from 'traverse';
import * as ddfQueryUtils from "./ddf-query-utils";

export {
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
  const normalizedKey = ddfQueryUtils.getPrefixByDot(key);
  return _.includes(resolvedProperties, normalizedKey);
}
