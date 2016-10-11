'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const ddfQueryUtils = require('./ddf-query-utils');
const constants = require('../ws.utils/constants');

module.exports = {
  normalizeDatapoints,
  normalizeDatapointDdfQuery,
  substituteDatapointConceptsWithIds,
  substituteDatapointJoinLinks
};

function normalizeDatapoints(query, concepts) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const safeConcepts = concepts || [];

  normalizeDatapointDdfQuery(safeQuery, safeConcepts);
  substituteDatapointConceptsWithIds(safeQuery, safeConcepts);

  return safeQuery;
}

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

function substituteDatapointConceptsWithIds(query, concepts) {
  const conceptOriginIdsByGids = _.chain(concepts)
    .keyBy(constants.GID)
    .mapValues(constants.ORIGIN_ID)
    .value();

  traverse(query.where).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query, this.key)) {
      let id;

      if (_.isArray(concept)) {
        id = _.chain(concept)
          .filter((conceptGid) => !!conceptOriginIdsByGids[conceptGid])
          .map(conceptGid => conceptOriginIdsByGids[conceptGid].toString())
          .value();
      } else {
        id = _.get(conceptOriginIdsByGids, concept, false);
        id = id ? id.toString() : id;
      }

      this.update(id ? id : concept);
    }
  });

  traverse(query.join).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
      const id = _.get(conceptOriginIdsByGids, concept, false);
      this.update(id ? id.toString() : concept);
    }
  });

  return query;
}

function normalizeDatapointDdfQuery(query, concepts) {
  normalizeWhere(query, concepts);
  normalizeJoin(query, concepts);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query, concepts) {
  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isMeasureFilter(this.key, query)) {
      normalizedFilter = {
        measure: this.key,
        value: filterValue
      };
    }

    if (isEntityFilter(this.key, query)) {
      normalizedFilter = evaluateNormalizedFilterByEntityFilter(filterValue, this.key, query);
    } else if (isEntityFilter(ddfQueryUtils.getPrefixByDot(this.key), query)) {
      const domainKey = ddfQueryUtils.getPrefixByDot(this.key);
      const domainWhere = {
        [ddfQueryUtils.cutPrefixByDot(this.key)]: filterValue
      };
      normalizedFilter = evaluateNormalizedFilterByEntityFilter(domainWhere, domainKey, query);
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

  const subWhere = query.where;

  query.where = {
    $and: [
      {dimensions: {
        $size: _.size(query.select.key),
        $all: getParsedDomainSubQuery(query, concepts)
      }},
      {measure: {$in: query.select.value}}
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }
}

function evaluateNormalizedFilterByEntityFilter(filterValue, key, query) {
  const join = _.get(query, 'join', {});
  const isUsedExistedLink = _.startsWith(filterValue, '$') && join.hasOwnProperty(filterValue);

  if (isUsedExistedLink) {
    return {
      dimensions: filterValue,
    };
  }

  const joinLink = `$parsed_${key}_${Math.random()}`;

  query.join[joinLink] = {
    key: key,
    where: {[key]: filterValue}
  };

  return {
    dimensions: joinLink
  };

}

function getParsedDomainSubQuery(query, concepts) {
  const conceptsByGids = _.keyBy(concepts, constants.GID);
  const conceptsByOriginIds = _.keyBy(concepts, constants.ORIGIN_ID);

  return _.map(query.select.key, conceptGid => {
    const concept = conceptsByGids[conceptGid];
    const domain = concept.domain ? conceptsByOriginIds[concept.domain] : concept;
    const parsedDomainJoinLink = `$parsed_domain_${domain[constants.GID]}_${Math.random()}`;

    query.join[parsedDomainJoinLink] = {
      key: domain[constants.GID],
      where: {}
    };
    return {$elemMatch: parsedDomainJoinLink};
  });
}

function normalizeJoin(query, concepts) {
  const conceptGids = _.map(concepts, constants.GID);
  const timeConcepts = _.chain(concepts)
    .filter(_.iteratee(['properties.concept_type', 'time']))
    .map(constants.GID)
    .value();

  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isEntityFilter(this.key, query)) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, timeConcepts)) {
        normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.join);
      } else if (!_.isObject(filterValue)) {
        normalizedFilter = {
          gid: filterValue
        };
      } else {
        normalizedFilter = _.mapKeys(filterValue, (subFilter, subkey) => {
          if (ddfQueryUtils.isEntityPropertyFilter(subkey, conceptGids)) {
            return ddfQueryUtils.wrapEntityProperties(subkey);
          }
          return subkey;
        });
      }
    }

    if (isDatapointEntityPropertyFilter(this.key, query)) {
      if (_.includes(this.path, 'where')) {
        const domainKey = getDomainKey(this.path, query);

        const key = ddfQueryUtils.cutPrefixByDot(this.key, domainKey);
        normalizedFilter = {
          [ddfQueryUtils.wrapEntityProperties(key)]: filterValue,
        };
      }
    }

    if (this.key === 'key') {
      normalizedFilter = {
        domain: filterValue,
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

  ddfQueryUtils.pullUpWhereSectionsInJoin(query);
}

function getDomainKey(path, query) {
  let domainPath = _.slice(path, 0, path.indexOf('where')).concat(['domain']);
  return _.get(query.join, domainPath);
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
