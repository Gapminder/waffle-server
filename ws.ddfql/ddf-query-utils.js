'use strict';

const _ = require('lodash');

module.exports = {
  toSafeQuery,
  replaceValueOnPath
};

function toSafeQuery(query, options) {
  const safeQuery = query || {};
  const safeOptions = options || {};

  if (!_.includes(safeOptions.except, 'join')) {
    safeQuery.join = _.get(safeQuery, 'join', {});
  }

  if (!_.includes(safeOptions.except, 'where')) {
    safeQuery.where = _.get(safeQuery, 'where', {});
  }

  if (!_.includes(safeOptions.except, 'select')) {
    safeQuery.select = _.get(safeQuery, 'select', {});
  }

  return safeQuery;
}

function replaceValueOnPath(options) {
  // we need to do a step back in path
  options.path.pop();
  const path = options.path;

  const key = options.key;
  const normalizedValue = options.normalizedValue;
  const queryFragment = options.queryFragment;

  const value = _.get(queryFragment, path);

  if (!value) return;

  if (options.substituteEntryWithItsContent) {
    const content = value[key];
    delete value[key];
    _.merge(value, content);
  } else {
    delete value[key];
    _.set(queryFragment, path, _.merge(value, normalizedValue));
  }
}
