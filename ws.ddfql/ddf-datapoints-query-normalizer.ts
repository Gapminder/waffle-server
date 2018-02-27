import * as _ from 'lodash';
import * as traverse from 'traverse';
import * as ddfQueryUtils from './ddf-query-utils';
import * as conceptUtils from '../ws.import/utils/concepts.utils';
import {constants} from '../ws.utils/constants';

export {
  normalizeDatapoints,
  _normalizeDatapointDdfQuery as normalizeDatapointDdfQuery,
  _substituteDatapointConceptsWithIds as substituteDatapointConceptsWithIds,
  substituteDatapointJoinLinks
};

function substituteDatapointJoinLinks(query: any, linksInJoinToValues: any): any {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);

  traverse(safeQuery.where).forEach(function (joinLink: string): void {
    /* tslint:disable: no-invalid-this */
    if (safeQuery.join.hasOwnProperty(joinLink)) {
      const matchedEntityIdsByLink = linksInJoinToValues[joinLink];
      const isEmptyEntityIdsList =_.isEmpty(matchedEntityIdsByLink);
      const domainOriginId = _.get(safeQuery.join, [joinLink, 'domain']);
      const setOriginId = _.get(safeQuery.join, [joinLink, 'sets']);
      const undesirableConceptOriginId = [domainOriginId || setOriginId];

      if(isEmptyEntityIdsList) {
       this.parent.node.dimensionsConcepts = { $nin: undesirableConceptOriginId };

       this.delete();
      } else {
        this.update(matchedEntityIdsByLink ? { $in: matchedEntityIdsByLink } : joinLink);
      }
    }
    /* tslint:enable: no-invalid-this */
  });

  return safeQuery;
}

function normalizeDatapoints(query: any, concepts: any): any {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];
  const domainGids = ddfQueryUtils.getDomainGids(safeConcepts);
  const conceptsByGids = ddfQueryUtils.getConceptsByGids(safeConcepts);
  const conceptsByOriginIds = ddfQueryUtils.getConceptsByOriginIds(safeConcepts);
  const domainGidsFromQuery = ddfQueryUtils.getDomainGidsFromQuery(safeQuery.select.key, conceptsByGids, conceptsByOriginIds);

  const options = Object.freeze({
    concepts: safeConcepts,
    conceptOriginIdsByGids: ddfQueryUtils.getConceptOriginIdsByGids(safeConcepts),
    conceptGids: ddfQueryUtils.getConceptGids(safeConcepts),
    domainGids,
    domainGidsFromQuery,
    timeConceptsGids: conceptUtils.getTimeConceptGids(safeConcepts),
    entitySetConceptsGids: conceptUtils.getEntitySetConceptGids(safeConcepts),
    conceptsByGids,
    conceptsByOriginIds
  });

  _normalizeDatapointDdfQuery(safeQuery, options);
  _substituteDatapointConceptsWithIds(safeQuery, options);

  return safeQuery;
}

function _normalizeDatapointDdfQuery(query: any, options: any): any {
  const filterByEntitySets = _.reduce(query.select.key, (result: any[], conceptGid: string) => {
    const concept = options.conceptsByGids[conceptGid];

    if (concept.type === constants.CONCEPT_TYPE_ENTITY_SET) {
      const domainGid = options.conceptsByOriginIds[concept.domain][constants.GID];
      result.push({[`${domainGid}.is--${conceptGid}`]: true});
    }
    return result;
  }, _.get(query, 'where.$and', []));

  if (!_.isEmpty(filterByEntitySets)) {
    _.set(query, 'where.$and', filterByEntitySets);
  }

  __normalizeWhere(query, options);
  __normalizeJoin(query, options);
  ddfQueryUtils.normalizeOrderBy(query);

  return query;
}

function __normalizeWhere(query: any, options: any): any {
  traverse(query.where).forEach(function (filterValue: any): void {
    /* tslint:disable: no-invalid-this */
    let normalizedFilter = null;

    if (isMeasureFilter(this.key, query)) {
      normalizedFilter = {
        measure: this.key,
        value: filterValue
      };
    }

    const domainKey = ddfQueryUtils.getPrefixByDot(this.key);

    if (isEntityFilter(this.key, query, options.domainGidsFromQuery) || isEntityFilter(domainKey, query, options.domainGidsFromQuery)) {
      normalizedFilter = ___evaluateNormalizedFilterByEntityFilter(filterValue, this.key, query);
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

  ___extendWhereWithDefaultClause(query, options);
}

function ___getDomainsFromConceptsList(conceptsByGids: any[], conceptGid: string): any {
  return _.get(conceptsByGids, `${conceptGid}.domain`) || conceptsByGids[conceptGid].originId;
}

function ___extendWhereWithDefaultClause(query: any, options: any): void {
  const subWhere = query.where;
  const {conceptsByGids} = options;
  const dimensionDomains = _.map(query.select.key, (conceptGid: string) => ___getDomainsFromConceptsList(conceptsByGids, conceptGid));

  query.where = {
    $and: [
      { dimensions: { $size: _.size(query.select.key) } },
      { dimensionsConcepts: { $all: dimensionDomains } },
      { measure: { $in: query.select.value } }
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }
}

function ___evaluateNormalizedFilterByEntityFilter(filterValue: any, filterKey: string, query: any): any {
  const join = _.get(query, 'join', {});
  const isUsedExistedLink = _.startsWith(filterValue, '$') && join.hasOwnProperty(filterValue);

  if (isUsedExistedLink) {
    return {
      dimensions: filterValue
    };
  }

  const domainKey = _.includes(filterKey, constants.IS_OPERATOR) ? ddfQueryUtils.getPrefixByDot(filterKey) : filterKey;
  const joinLink = `$parsed_${domainKey}_${_.random()}`;

  query.join[joinLink] = {
    key: domainKey,
    where: { [filterKey]: filterValue }
  };

  return {
    dimensions: joinLink
  };

}

function __normalizeJoin(query: any, options: any): void {
  const queryCopy = _.cloneDeep(query);

  // todo: provide next functionality: map by join, traverse for each of join-where section and get normalizedFilters
  // main goal is avoid queryCopy and this kind `traverse.get(queryCopy.join, this.parent.parent.path)` of logic
  traverse(query.join).forEach(function (filterValue: any): void {
    /* tslint:disable: no-invalid-this */
    let normalizedFilter = null;

    const isWhereClause = _.includes(this.path, 'where');
    const isTimePropertyFilter = isEntityFilter(this.key, query, options.domainGids) && ddfQueryUtils.isTimePropertyFilter(this.key, options.timeConceptsGids);

    if (isWhereClause && isTimePropertyFilter) {
      normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.join);
    }

    const isEntityPropertyFilter = isDatapointEntityPropertyFilter(this.key, query, options.domainGids);

    if (isWhereClause && !isTimePropertyFilter && isEntityPropertyFilter) {
      normalizedFilter = {
        [ddfQueryUtils.wrapEntityProperties(this.key, options.domainGidsFromQuery, options)]: filterValue
      };
    }

    const isKeyInDomainsOrSetsList = ddfQueryUtils.isDomainPropertyFilter(this.key, options);

    if (isWhereClause && !isTimePropertyFilter && !isEntityPropertyFilter && isKeyInDomainsOrSetsList) {
      const branchWithKey = traverse.get(queryCopy.join, this.parent.parent.path);

      if (this.key !== branchWithKey.key && _.includes(options.entitySetConceptsGids, this.key)) {
        normalizedFilter = {
          [`properties.${this.key}`]: filterValue
        };
      } else {
        normalizedFilter = {
          gid: filterValue
        };
      }
    }

    if (this.key === 'key') {
      const conceptType = _.get(options, `conceptsByGids.${filterValue}.properties.concept_type`);
      const domainOrSetOriginId = _.get(options, `conceptsByGids.${filterValue}.originId`);

      if (conceptType === 'entity_domain' || conceptType !== 'entity_set') {
        normalizedFilter = {
          domain: domainOrSetOriginId
        };
      } else {
        normalizedFilter = {
          sets: domainOrSetOriginId
        };
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

function _substituteDatapointConceptsWithIds(query: any, options: any): any {
  __substituteWhereClause(query, options);
  __substituteJoinClauses(query, options);

  return query;
}

function __substituteWhereClause(query: any, options: any): void {
  traverse(query.where).forEach(function (concept: any): void {
    /* tslint:disable: no-invalid-this */
    if (shouldSubstituteValueWithId(concept, query, options.domainGids)) {
      let id;

      if (_.isArray(concept)) {
        id = _.chain(concept)
          .filter((conceptGid: string) => !!options.conceptOriginIdsByGids[conceptGid])
          .map((conceptGid: string) => options.conceptOriginIdsByGids[conceptGid])
          .value();
      } else {
        id = _.get(options.conceptOriginIdsByGids, concept, false);
      }

      this.update(id ? id : concept);
    }
    /* tslint:enable: no-invalid-this */
  });
}

function __substituteJoinClauses(query: any, options: any): void {
  traverse(query.join).forEach(function (concept: any): void {
    /* tslint:disable: no-invalid-this */
    if (shouldSubstituteValueWithId(concept, query, options.domainGids)) {
      const id = _.get(options.conceptOriginIdsByGids, concept, false);
      this.update(id ? _.toString(id) : concept);
    }
    /* tslint:enable: no-invalid-this */
  });
}

// **** HELPERS
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

function isMeasureFilter(key: string, query: any): boolean {
  return _.includes(query.select.value, key);
}

function isEntityFilter(key: string, query: any, domainGids: string[]): boolean {
  return _.includes(query.select.key, key) || _.includes(domainGids, key);
}

function isDatapointEntityPropertyFilter(key: string, query: any, domainGids: string[]): boolean {
  // const concept = _.head(_.split(key, '.'));
  // return _.includes(query.select.key, concept) && _.includes(key, `${concept}.`);
  return !isEntityFilter(key, query, domainGids) && !isOperator(key) && isNaN(Number(key));
}

function isOperator(key: string): boolean {
  return _.startsWith(key, '$') || _.includes(['key', 'where'], key);
}

function shouldSubstituteValueWithId(value: any, query: any, domainGids: string[]): any {
  if (_.isArray(value)) {
    return value.every((item: any) => shouldSubstituteValueWithId(item, query, domainGids));
  }

  return isEntityFilter(value, query, domainGids) || isMeasureFilter(value, query);
}
