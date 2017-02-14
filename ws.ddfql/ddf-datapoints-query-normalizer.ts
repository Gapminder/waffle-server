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

function substituteDatapointJoinLinks(query, linksInJoinToValues) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);

  traverse(safeQuery.where).forEach(function (link) {
    if (safeQuery.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      this.update(id ? {$in: id} : link);
    }
  });

  return safeQuery;
}

function normalizeDatapoints(query, concepts) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];

  const options = Object.freeze({
    concepts: safeConcepts,
    conceptOriginIdsByGids: ddfQueryUtils.getConceptOriginIdsByGids(safeConcepts),
    conceptGids: ddfQueryUtils.getConceptGids(safeConcepts),
    domainGids: ddfQueryUtils.getDomainGids(safeConcepts),
    timeConceptsGids: conceptUtils.getTimeConceptGids(safeConcepts),
    conceptsByGids: ddfQueryUtils.getConceptsByGids(safeConcepts),
    conceptsByOriginIds: ddfQueryUtils.getConceptsByOriginIds(safeConcepts),
  });

  _normalizeDatapointDdfQuery(safeQuery, options);
  _substituteDatapointConceptsWithIds(safeQuery, options);

  return safeQuery;
}

function _normalizeDatapointDdfQuery(query, options) {

  __normalizeWhere(query, options);
  __normalizeJoin(query, options);
  ddfQueryUtils.normalizeOrderBy(query);

  return query;
}

function __normalizeWhere(query, options) {
  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isMeasureFilter(this.key, query)) {
      normalizedFilter = {
        measure: this.key,
        value: filterValue
      };
    }

    if (isEntityFilter(this.key, query)) {
      normalizedFilter = ___evaluateNormalizedFilterByEntityFilter(filterValue, this.key, query);
    }

    if (!isEntityFilter(this.key, query) && isEntityFilter(ddfQueryUtils.getPrefixByDot(this.key), query)) {
      const domainKey = ddfQueryUtils.getPrefixByDot(this.key);
      const domainWhere = {
        [ddfQueryUtils.cutPrefixByDot(this.key)]: filterValue
      };
      normalizedFilter = ___evaluateNormalizedFilterByEntityFilter(domainWhere, domainKey, query);
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

  ___extendWhereWithDefaultClause(query, options);
}

function ___extendWhereWithDefaultClause(query, options) {
  const subWhere = query.where;

  query.where = {
    $and: [
      {dimensions: {$size: _.size(query.select.key)}},
      {dimensionsConcepts: {$all: _.map(query.select.key, (conceptGid: string) => options.conceptOriginIdsByGids[conceptGid])}},
      {measure: {$in: query.select.value}}
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }
}

function ___evaluateNormalizedFilterByEntityFilter(filterValue, key, query) {
  const join = _.get(query, 'join', {});
  const isUsedExistedLink = _.startsWith(filterValue, '$') && join.hasOwnProperty(filterValue);

  if (isUsedExistedLink) {
    return {
      dimensions: filterValue,
    };
  }

  const joinLink = `$parsed_${key}_${_.random()}`;

  query.join[joinLink] = {
    key: key,
    where: {[key]: filterValue}
  };

  return {
    dimensions: joinLink
  };

}

function __normalizeJoin(query, options) {
  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    const isWhereClause = _.includes(this.path, 'where');
    const isTimePropertyFilter = isEntityFilter(this.key, query) && ddfQueryUtils.isTimePropertyFilter(this.key, options.timeConceptsGids);

    if (isWhereClause && isTimePropertyFilter) {
      normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.join);
    }

    const isEntityPropertyFilter = isDatapointEntityPropertyFilter(this.key, query);

    if (isWhereClause && !isTimePropertyFilter && isEntityPropertyFilter) {
      normalizedFilter = {
        [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue,
      };
    }

    const isKeyInDomainsOrSetsList = ddfQueryUtils.isDomainPropertyFilter(this.key, options);

    if (isWhereClause && !isTimePropertyFilter && !isEntityPropertyFilter && isKeyInDomainsOrSetsList) {
      normalizedFilter = {
        gid: filterValue
      };
    }

    if (this.key === 'key') {
      const domainOrSetOriginId = _.get(options, `conceptsByGids.${filterValue}.originId`);
      normalizedFilter = {
        $or: [{domain: domainOrSetOriginId}, {sets: domainOrSetOriginId}]
      };
    }

    if (normalizedFilter) {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.join
      });
    }
  });

  pullUpWhereSectionsInJoin(query);
}

function _substituteDatapointConceptsWithIds(query, options) {
  __substituteWhereClause(query, options);
  __substituteJoinClauses(query, options);

  return query;
}

function __substituteWhereClause(query, options) {
  traverse(query.where).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
      let id;

      if (_.isArray(concept)) {
        id = _.chain(concept)
          .filter((conceptGid: string) => !!options.conceptOriginIdsByGids[conceptGid])
          .map((conceptGid: string) => options.conceptOriginIdsByGids[conceptGid].toString())
          .value();
      } else {
        id = _.get(options.conceptOriginIdsByGids, concept, false);
        id = id ? id.toString() : id;
      }

      this.update(id ? id : concept);
    }
  });
}

function __substituteJoinClauses(query, options) {
  traverse(query.join).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
      const id = _.get(options.conceptOriginIdsByGids, concept, false);
      this.update(id ? _.toString(id) : concept);
    }
  });
}

// **** HELPERS
function pullUpWhereSectionsInJoin(query) {
  traverse(query.join).forEach(function () {
    if (this.key === 'where') {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        queryFragment: query.join,
        substituteEntryWithItsContent: true
      });
    }
  });
}

function isMeasureFilter(key, query) {
  return _.includes(query.select.value, key);
}

function isEntityFilter(key, query) {
  return _.includes(query.select.key, key);
}

function isDatapointEntityPropertyFilter(key, query) {
  // const concept = _.head(_.split(key, '.'));
  // return _.includes(query.select.key, concept) && _.includes(key, `${concept}.`);
  return !isEntityFilter(key, query) && !isOperator(key) && isNaN(Number(key));
}

function isOperator(key) {
  return _.startsWith(key, '$') || _.includes(['key', 'where'], key);
}

function shouldSubstituteValueWithId(value, query) {
  if (_.isArray(value)) {
    return value.every(item => shouldSubstituteValueWithId(item, query));
  }

  return isEntityFilter(value, query) || isMeasureFilter(value, query);
}
