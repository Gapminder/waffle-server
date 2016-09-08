'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const ddfTimeUtils = require('ddf-time-utils');

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
  return safeConcepts;
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
  if (_.isEmpty(query.join)) {
    _.set(query, 'join', {});
  }

  normalizeWhere(query, concepts);
  normalizeJoin(query, concepts);
  return query;
}

function normalizeWhere(query, concepts) {
  const timeConcepts = _.chain(concepts)
    .filter(_.iteratee(['properties.concept_type', 'time']))
    .map(constants.GID)
    .value();
  const conceptGids = _.map(concepts, 'gid');

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;
    const selectKey = _.first(query.select.key);

    if (isEntityPropertyFilter(selectKey, this.key, conceptGids)) {
      if (isTimePropertyFilter(this.key, timeConcepts)) {
        normalizedFilter = normalizeTimePropertyFilter(this.key, filterValue, this.path, 'where', query);
      } else {
        normalizedFilter = {
          [`properties.${this.key}`]: filterValue,
        };
      }
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
}

function normalizeTimePropertyFilter(key, filterValue, path, property, query) {
  let timeType = '';
  const normalizedFilter = {
    [`parsedProperties.${key}.millis`]: traverse(filterValue).map(function (value) {
      if (this.notLeaf) {
        return value;
      }

      const timeDescriptor = ddfTimeUtils.parseTime(value);
      timeType = timeDescriptor.type;
      return timeDescriptor.time;
    })
  };

  // always set latest detected time type
  const conditionsForTimeEntities = _.get(query[property], path.slice(0, path.length - 1));
  conditionsForTimeEntities[`parsedProperties.${key}.timeType`] = timeType;

  return normalizedFilter;
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
      if (isTimePropertyFilter(this.key, timeConcepts)) {
        normalizedFilter = normalizeTimePropertyFilter(this.key, filterValue, this.path, 'join', query);
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

function isTimePropertyFilter(key, timeConcepts) {
  return _.includes(timeConcepts, key);
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
