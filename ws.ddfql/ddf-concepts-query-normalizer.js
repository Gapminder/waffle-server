'use strict';

const _ = require('lodash');
const traverse = require('traverse');

module.exports = {
  normalizeConcepts: normalizeConcepts,
  normalizeConceptDdfQuery: normalizeConceptDdfQuery,
  substituteConceptConceptsWithIds: substituteConceptConceptsWithIds,
  substituteConceptJoinLinks: substituteConceptJoinLinks
};

function normalizeConcepts(query, concepts) {
  normalizeConceptDdfQuery(query, concepts);
  substituteConceptConceptsWithIds(query, concepts);
  return query;
}

function substituteConceptJoinLinks(query, linksInJoinToValues) {
  traverse(query.where).forEach(function (link) {
    if (query.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      this.update(id ? {$in: id} : link);
    }
  });
  return query;
}

function substituteConceptConceptsWithIds(query, concepts) {
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

function normalizeConceptDdfQuery(query, concepts) {
  normalizeWhere(query, concepts);
  normalizeJoin(query, concepts);
  return query;
}

function normalizeWhere(query, concepts) {
  const resolvedProperties = _.map(concepts, 'gid');

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isConceptPropertyFilter(this.key, resolvedProperties)) {
      normalizedFilter = {
        [`properties.${this.key}`]: filterValue,
      };
    }

    if (normalizedFilter) {
      replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.where
      });
    }
  });
}

function normalizeJoin(query, concepts) {
  const conceptsByGid = _.keyBy(concepts, 'gid');
  const resolvedProperties = _.map(concepts, 'gid');

  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isConceptPropertyFilter(this.key, resolvedProperties)) {
      if (_.includes(this.path, 'where')) {
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

function isConceptPropertyFilter(key, resolvedProperties) {
  return _.includes(resolvedProperties, _.replace(key, /^is--/, ''));
}

function shouldSubstituteValueWithId(key) {
  return isSetFilter(key) || isDomainFilter(key);
}
