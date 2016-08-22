'use strict';

const _ = require('lodash');
const traverse = require('traverse');

module.exports = {
  normalizeEntities: normalizeEntities,
  normalizeEntityDdfQuery: normalizeEntityDdfQuery,
  substituteEntityConceptsWithIds: substituteEntityConceptsWithIds,
  substituteEntityJoinLinks: substituteEntityJoinLinks
};

function normalizeEntities(query, concepts) {
  normalizeEntityDdfQuery(query, concepts);
  substituteEntityConceptsWithIds(query, concepts);
  console.log(JSON.stringify(query, null, '\t'));
  return query;
}

function substituteEntityJoinLinks(query, linksInJoinToValues) {
  traverse(query.where).forEach(function (link) {
    if (query.join.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      this.update(id ? {$in: id} : link);
    }
  });
  return query;
}

function substituteEntityConceptsWithIds(query, conceptsToIds) {
  traverse(query.where).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
      const id = conceptsToIds[concept];
      this.update(id ? id : concept);
    }
  });

  traverse(query.join).forEach(function (concept) {
    if (shouldSubstituteValueWithId(concept, query)) {
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
  const resolvedProperties = _.map(concepts, 'gid');

  traverse(query.where).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (isEntityPropertyFilter(this.key, resolvedProperties)) {
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

    if (isEntityPropertyFilter(this.key, resolvedProperties)) {
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

function isMeasureFilter(key, query) {
  return _.includes(query.select.value, key);
}

function isEntityFilter(key, query) {
  return _.includes(query.select.key, key);
}

function isEntityPropertyFilter(key, resolvedProperties) {
  return _.includes(resolvedProperties, key);
}

function isOperator(key) {
  return _.startsWith(key, '$') || _.includes(['key', 'where'], key);
}

function shouldSubstituteValueWithId(value, query) {
  return isEntityFilter(value, query) || isMeasureFilter(value, query);
}
