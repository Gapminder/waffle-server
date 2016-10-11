'use strict';

const _ = require('lodash');
const traverse = require('traverse');

const constants = require('../ws.utils/constants');
const ddfQueryUtils = require("./ddf-query-utils");

module.exports = {
  normalizeEntities,
  substituteEntityJoinLinks
};

function normalizeEntities(query, concepts) {
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
    timeConcepts: ddfQueryUtils.getTimeConcepts(safeConcepts),
    conceptsByGids,
    conceptsByOriginIds: ddfQueryUtils.getConceptsByOriginIds(safeConcepts),
  });

  normalizeEntityDdfQuery(safeQuery, options);
  substituteEntityConceptsWithIds(safeQuery, options);

  return safeQuery;
}

function substituteEntityJoinLinks(query, linksInJoinToValues) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);

  traverse(safeQuery.where).forEach(function (link) {
    if (safeQuery.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      const value = id ? {$in: id} : link;
      _.set(safeQuery.where, this.path, value);
    }
  });
  return safeQuery;
}

function substituteEntityConceptsWithIds(query, options) {
  const conceptsToIds = options.conceptOriginIdsByGids;

  traverse(query.where).forEach(function (concept) {
    if (shouldSubstituteValueWithId(this.key)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
  });

  traverse(query.join).forEach(function (concept) {
    if (shouldSubstituteValueWithId(this.key)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
  });

  return query;
}

function normalizeEntityDdfQuery(query, options) {
  normalizeWhere(query, options);
  normalizeJoin(query, options);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query, options) {
  const conceptOriginIds = options.conceptOriginIds;

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;
    const selectKey = _.first(query.select.key);

    if (ddfQueryUtils.isEntityPropertyFilter(this.key, options)) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, options)) {
        normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.where);
      } else {
        normalizedFilter = {
          [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue,
        };
      }
    }

    if (selectKey === this.key) {
      normalizedFilter = {
        gid: filterValue
      };
    }

    if (normalizedFilter) {
      const options = {
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.where
      };
      ddfQueryUtils.replaceValueOnPath(options);
    }
  });

  const subWhere = query.where;

  query.where = {
    $and: [
      {$or: [
        {domain: {$in: conceptOriginIds}},
        {sets: {$in: conceptOriginIds}}
      ]},
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }
}

function normalizeJoin(query, options) {
  const conceptsByGids = options.conceptsByGids;

  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (ddfQueryUtils.isEntityPropertyFilter(this.key, options) && _.includes(this.path, 'where')) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, options)) {
        normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.join);
      } else {
        normalizedFilter = {
          [ddfQueryUtils.wrapEntityProperties(this.key, options)]: filterValue,
        };
      }
    }

    if (this.key === 'key') {
      normalizedFilter = {};
      if (_.get(conceptsByGids, `${filterValue}.properties.concept_type`) === 'entity_set') {
        normalizedFilter.sets = filterValue;
      }

      if (_.get(conceptsByGids, `${filterValue}.properties.concept_type`) === 'entity_domain') {
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
  });

  pullUpWhereSectionsInJoin(query);
}

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

function isDomainFilter(key) {
  return key === 'domain';
}

function isSetFilter(key) {
  return key === 'sets';
}

function shouldSubstituteValueWithId(key) {
  return isSetFilter(key) || isDomainFilter(key);
}
