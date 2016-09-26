'use strict';

const _ = require('lodash');
const ddfTimeUtils = require('ddf-time-utils');
const constants = require('../ws.utils/constants');
const traverse = require('traverse');

module.exports = {
  toSafeQuery,
  replaceValueOnPath,
  normalizeTimePropertyFilter,
  isTimePropertyFilter,
  normalizeOrderBy,
  convertOrderByForWsJson
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

  if (!_.includes(safeOptions.except, 'order_by')) {
    safeQuery.order_by = _.get(safeQuery, 'order_by', []);
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

function normalizeOrderBy(query) {
  if (!_.isArray(query.order_by)) {
    return;
  }

  query.order_by = _.map(query.order_by, statement => {
    if (_.isObject(statement)) {
      return statement;
    }

    return {[statement]: constants.ASC_SORTING_DIRECTION};
  });
}

function normalizeTimePropertyFilter(key, filterValue, path, query) {
  let timeType = '';
  const normalizedFilter = {
    [`parsedProperties.${key}.millis`]: traverse(filterValue).map(function (value) {
      if (this.notLeaf) {
        return value;
      }

      if (_.isObject(value) && _.isEmpty(value)) {
        return value;
      }

      const timeDescriptor = ddfTimeUtils.parseTime(value);
      timeType = timeDescriptor.type;
      return timeDescriptor.time;
    })
  };

  // always set latest detected time type
  const conditionsForTimeEntities = _.get(query, path.slice(0, path.length - 1));
  conditionsForTimeEntities[`parsedProperties.${key}.timeType`] = timeType;

  return normalizedFilter;
}

function isTimePropertyFilter(key, timeConcepts) {
  return _.includes(timeConcepts, key);
}

function convertOrderByForWsJson(orderBy, headers) {
  const propertyIndexToSortDirection = _.map(orderBy, sortDescriptor => {
    const propertyToSort = _.first(_.keys(sortDescriptor));
    const propertyToSortIndex = _.findIndex(headers, header => propertyToSort === header);
    return [String(propertyToSortIndex), sortDescriptor[propertyToSort]];
  });

  const unzippedPropertyIndexToSortDirection = _.unzip(propertyIndexToSortDirection);

  return {
    columnsToSort: _.first(unzippedPropertyIndexToSortDirection),
    columnsSortDirections: _.last(unzippedPropertyIndexToSortDirection)
  };
}

