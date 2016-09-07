'use strict';

const _ = require('lodash');
const traverse = require('traverse');

const constants = require('../ws.utils/constants');
const ddfTimeUtils = require('ddf-time-utils');

module.exports = {
  normalizeEntities: normalizeEntities,
  normalizeEntityDdfQuery: normalizeEntityDdfQuery,
  substituteEntityConceptsWithIds: substituteEntityConceptsWithIds,
  substituteEntityJoinLinks: substituteEntityJoinLinks
};

function normalizeEntities(query, concepts) {
  normalizeEntityDdfQuery(query, concepts);
  substituteEntityConceptsWithIds(query, concepts);
  return query;
}

function substituteEntityJoinLinks(query, linksInJoinToValues) {
  traverse(query.where).forEach(function (link) {
    if (query.join && query.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      const value = id ? {$in: id} : link;
      _.set(query.where, this.path, value);
    }
  });
  return query;
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
      replaceValueOnPath(options);
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
      replaceValueOnPath({
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
      replaceValueOnPath({
        key: this.key,
        path: this.path,
        queryFragment: query.join,
        substituteEntryWithItsContent: true
      });
    }
  });
}

function replaceValueOnPath(options) {
  // we need to do a step back in path
  options.path.pop();
  const path = options.path;

  const key = options.key;
  const normalizedValue = options.normalizedValue;
  const queryFragment = options.queryFragment;

  const value = _.get(queryFragment, path);

  if (options.substituteEntryWithItsContent) {
    const content = value[key];
    delete value[key];
    _.merge(value, content);
  } else {
    delete value[key];
    _.set(queryFragment, path, _.merge(value, normalizedValue));
  }
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
