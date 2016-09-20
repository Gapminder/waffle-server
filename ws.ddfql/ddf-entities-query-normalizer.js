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

  normalizeEntityDdfQuery(safeQuery, safeConcepts);
  substituteEntityConceptsWithIds(safeQuery, safeConcepts);
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

function substituteEntityConceptsWithIds(query, concepts) {
  const conceptsToIds = _.chain(concepts)
    .keyBy('gid')
    .mapValues('originId')
    .value();

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

function normalizeEntityDdfQuery(query, concepts) {
  normalizeWhere(query, concepts);
  normalizeJoin(query, concepts);
  return query;
}

function normalizeWhere(query, concepts) {
  const timeConcepts = _.chain(concepts)
    .filter(_.iteratee(['properties.concept_type', 'time']))
    .map(constants.GID)
    .value();
  const conceptGids = _.map(concepts, constants.GID);
  const conceptsByGids = _.keyBy(concepts, constants.GID);

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;
    const selectKey = _.first(query.select.key);

    if (isEntityPropertyFilter(selectKey, this.key, conceptGids)) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, timeConcepts)) {
        normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.where);
      } else {
        normalizedFilter = {
          [`properties.${this.key}`]: filterValue,
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

  const conceptOriginId = _.get(conceptsByGids, `${query.select.key}.originId`, null);

  query.where = {
    $and: [
      {$or: [
        {domain: conceptOriginId},
        {sets: conceptOriginId}
      ]},
    ]
  };

  if (!_.isEmpty(subWhere)) {
    query.where.$and.push(subWhere);
  }

}

function normalizeJoin(query, concepts) {
  const timeConcepts = _.chain(concepts)
    .filter(_.iteratee(['properties.concept_type', 'time']))
    .map(constants.GID)
    .value();
  const conceptsByGid = _.keyBy(concepts, 'gid');
  const resolvedProperties = _.map(concepts, 'gid');

  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;
    const selectKey = _.first(query.select.key);

    if (isEntityPropertyFilter(selectKey, this.key, resolvedProperties) && _.includes(this.path, 'where')) {
      if (ddfQueryUtils.isTimePropertyFilter(this.key, timeConcepts)) {
        normalizedFilter = ddfQueryUtils.normalizeTimePropertyFilter(this.key, filterValue, this.path, query.join);
      } else {
        normalizedFilter = {
          [`properties.${this.key}`]: filterValue,
        };
      }
    }

    if (this.key === 'key') {
      normalizedFilter = {};
      if (_.get(conceptsByGid, `${filterValue}.type`) === 'entity_set') {
        normalizedFilter.sets = filterValue;
      }

      if (_.get(conceptsByGid, `${filterValue}.type`) === 'entity_domain') {
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

function isEntityPropertyFilter(selectKey, key, resolvedProperties) {
  // TODO: `^${selectKey}\.` is just hack for temporary support of current query from Vizabi. It will be removed.
  const normalizedKey = _.chain(key)
    .replace(new RegExp(`^${selectKey}\.`), '')
    .split('.').first().replace(/^is--/, '').value();

  return _.includes(resolvedProperties, normalizedKey);
}

function shouldSubstituteValueWithId(key) {
  return isSetFilter(key) || isDomainFilter(key);
}
