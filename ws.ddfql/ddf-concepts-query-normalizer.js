'use strict';

const _ = require('lodash');
const traverse = require('traverse');

module.exports = {
  normalizeConcepts: normalizeConcepts,
  normalizeConceptDdfQuery: normalizeConceptDdfQuery,
};

function normalizeConcepts(query, concepts) {
  normalizeConceptDdfQuery(query, concepts);
  return query;
}

function normalizeConceptDdfQuery(query, concepts) {
  normalizeWhere(query, concepts);
  return query;
}

function normalizeWhere(query, concepts) {
  const resolvedProperties = _.chain(concepts)
    .map('gid')
    .concat(['concept', 'concept_type'])
    .sort()
    .value();

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

function isConceptPropertyFilter(key, resolvedProperties) {
  const normalizedKey = _.chain(key).split('.').first().value();
  return _.includes(resolvedProperties, normalizedKey);
}
