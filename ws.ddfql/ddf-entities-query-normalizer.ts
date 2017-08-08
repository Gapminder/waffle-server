import * as  _ from 'lodash';
import * as traverse from 'traverse';

import { constants } from '../ws.utils/constants';
import * as ddfQueryUtils from './ddf-query-utils';
import * as conceptUtils from '../ws.import/utils/concepts.utils';

export {
  normalizeEntities,
  substituteEntityJoinLinks
};

function normalizeEntities(query: any, concepts: any[]): any {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];

  const conceptsByGids = ddfQueryUtils.getConceptsByGids(safeConcepts);
  const conceptOriginIds = _.chain(conceptsByGids)
    .pick(query.select.key)
    .map(constants.ORIGIN_ID)
    .value();

  const options = Object.freeze({
    concepts: safeConcepts,
    conceptOriginIds,
    conceptOriginIdsByGids: ddfQueryUtils.getConceptOriginIdsByGids(safeConcepts),
    conceptGids: ddfQueryUtils.getConceptGids(safeConcepts),
    domainGids: ddfQueryUtils.getDomainGids(safeConcepts),
    timeConceptsGids: conceptUtils.getTimeConceptGids(safeConcepts),
    conceptsByGids,
    conceptsByOriginIds: ddfQueryUtils.getConceptsByOriginIds(safeConcepts)
  });

  normalizeEntityDdfQuery(safeQuery, options);
  substituteEntityConceptsWithIds(safeQuery, options);

  return safeQuery;
}

function substituteEntityJoinLinks(query: any, linksInJoinToValues: any): any {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);

  traverse(safeQuery.where).forEach(function (link: string): void {
    /* tslint:disable: no-invalid-this */
    if (safeQuery.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      const value = id ? { $in: id } : link;
      _.set(safeQuery.where, this.path, value);
    }
    /* tslint:enable: no-invalid-this */
  });
  return safeQuery;
}

function substituteEntityConceptsWithIds(query: any, options: any): void {
  const conceptsToIds = options.conceptOriginIdsByGids;

  traverse(query.where).forEach(function (concept: string): void {
    /* tslint:disable: no-invalid-this */
    if (shouldSubstituteValueWithId(this.key)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
    /* tslint:enable: no-invalid-this */
  });

  traverse(query.join).forEach(function (concept: string): void {
    /* tslint:disable: no-invalid-this */
    if (shouldSubstituteValueWithId(this.key)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
    /* tslint:enable: no-invalid-this */
  });

  return query;
}

function normalizeEntityDdfQuery(query: any, options: any): any {
  normalizeWhere(query, options);
  normalizeJoin(query, options);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query: any, options: any): void {
  const conceptOriginIds = options.conceptOriginIds;

  traverse(query.where).forEach(function (filterValue: any): void {
    /* tslint:disable: no-invalid-this */
    let normalizedFilter = null;
    const selectKey = _.first(query.select.key);

    if (ddfQueryUtils.isEntityPropertyFilter(this.key, options)) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, options.timeConceptsGids)) {
        normalizedFilter = ddfQueryUtils.normalizeEntityTimePropertyFilter(this.key, filterValue, this.path, query.where);
      } else {
        normalizedFilter = {
          [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue
        };
      }
    }

    if (selectKey === this.key) {
      normalizedFilter = {
        gid: filterValue
      };
    }

    if (normalizedFilter) {
      const replacementOptions = {
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.where
      };
      ddfQueryUtils.replaceValueOnPath(replacementOptions);
    }
    /* tslint:enable: no-invalid-this */
  });

  const subWhere = query.where;

  query.where = {
    $and: [
      {
        $or: [
          { domain: { $in: conceptOriginIds } },
          { sets: { $in: conceptOriginIds } }
        ]
      }
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }
}

function normalizeJoin(query: any, options: any): void {
  const conceptsByGids = options.conceptsByGids;

  const joinKeys = _.keyBy(query.join, 'key');

  traverse(query.join).forEach(function (filterValue: any): void {
    /* tslint:disable: no-invalid-this */
    let normalizedFilter = null;

    if (ddfQueryUtils.isEntityPropertyFilter(this.key, options) && _.includes(this.path, 'where')) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, options.timeConceptsGids)) {
        normalizedFilter = ddfQueryUtils.normalizeDatapointTimePropertyFilter(this.key, filterValue, this.path, query.join);
      } else if (joinKeys[this.key]) {
        normalizedFilter = {
          gid: filterValue
        };
      } else {
        normalizedFilter = {
          [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue
        };
      }
    }

    if (this.key === 'key') {
      normalizedFilter = {};
      if (_.get(conceptsByGids, `${filterValue}.${constants.PROPERTIES}.${constants.CONCEPT_TYPE}`) === constants.CONCEPT_TYPE_ENTITY_SET) {
        normalizedFilter.sets = filterValue;
      }

      if (_.get(conceptsByGids, `${filterValue}.${constants.PROPERTIES}.${constants.CONCEPT_TYPE}`) === constants.CONCEPT_TYPE_ENTITY_DOMAIN) {
        normalizedFilter.domain = filterValue;
      }
    }

    if (normalizedFilter) {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.join
      });
    }
    /* tslint:enable: no-invalid-this */
  });

  pullUpWhereSectionsInJoin(query);
}

function pullUpWhereSectionsInJoin(query: any): void {
  traverse(query.join).forEach(function (): void {
    /* tslint:disable: no-invalid-this */
    if (this.key === 'where') {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        queryFragment: query.join,
        substituteEntryWithItsContent: true
      });
    }
    /* tslint:enable: no-invalid-this */
  });
}

function isDomainFilter(key: string): boolean {
  return key === 'domain';
}

function isSetFilter(key: string): boolean {
  return key === 'sets';
}

function shouldSubstituteValueWithId(key: string): boolean {
  return isSetFilter(key) || isDomainFilter(key);
}
