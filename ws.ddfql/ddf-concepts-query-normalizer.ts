import * as _ from 'lodash';
import * as traverse from 'traverse';
import * as ddfQueryUtils from './ddf-query-utils';

export function normalizeConcepts(query: any, concepts: any): any {
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

function normalizeConceptDdfQuery(query: any, options: any): any {
  normalizeWhere(query, options);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query: any, options: any): void {
  traverse(query.where).forEach(function (filterValue: any): void {
    /* tslint:disable: no-invalid-this */
    let normalizedFilter = null;

    if (isConceptPropertyFilter(this.key, options.conceptGids)) {
      normalizedFilter = {
        [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue
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
    /* tslint:enable: no-invalid-this */
  });
}

function isConceptPropertyFilter(key: string, resolvedProperties: any[]): boolean {
  const normalizedKey = ddfQueryUtils.getPrefixByDot(key);
  return _.includes(resolvedProperties, normalizedKey);
}
