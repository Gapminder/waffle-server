'use strict';

const _ = require('lodash');
const ddfTimeUtils = require('ddf-time-utils');
const constants = require('../ws.utils/constants');
const traverse = require('traverse');

const normalizeKey = _.flow([cutPrefixByDot, _.partialRight(_.split, '.'), _.first, cutPrefixByDashes]);

module.exports = {
  toSafeQuery,
  replaceValueOnPath,
  normalizeTimePropertyFilter,
  isTimePropertyFilter,
  isDomainPropertyFilter,
  normalizeOrderBy,
  convertOrderByForWsJson,
  isEntityPropertyFilter,
  getPrefixByDot,
  cutPrefixByDashes,
  cutPrefixByDot,
  wrapEntityProperties,
  normalizeKey,
  getConceptGids,
  getDomainGids,
  getConceptOriginIdsByGids,
  getConceptsByGids,
  getConceptsByOriginIds
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
  const conditionsForTimeEntities = _.get(query, path.slice(0, path.length - 1), []);
  conditionsForTimeEntities[`parsedProperties.${key}.timeType`] = timeType;

  return normalizedFilter;
}

function isTimePropertyFilter(key, timeConceptsGids) {
  return _.includes(timeConceptsGids, key);
}

function isDomainPropertyFilter(key, options) {
  return _.includes(options.domainGids, key);
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

function isEntityPropertyFilter(key, options) {
  return _.includes(options.conceptGids, normalizeKey(key, options.domainGids));
}

function getPrefixByDot(value) {
  return _.chain(value).split('.').first().value();
}

function cutPrefixByDot(value, prefix) {
  if (_.isNil(prefix)) {
    return _.replace(value, /^\w*\./, '');
  }

  if (_.isEmpty(prefix)) {
    return value;
  }

  if (_.isArray(prefix)) {
    return _.replace(value, new RegExp(`^(${_.join(prefix, '|')})\.`), '');
  }

  return _.replace(value, new RegExp(`^${prefix}\.`), '');
}

function cutPrefixByDashes(value) {
  return _.replace(value, /^is--/, '');
}

function wrapEntityProperties(key, options) {
  const propertyName = cutPrefixByDot(key, options.domainGids);

  if (!isTimePropertyFilter(key, options) && isEntityPropertyFilter(propertyName, options)) {
    return `properties.${propertyName}`;
  }

  return propertyName;
}

function getConceptGids(concepts) {
  return _.chain(concepts)
    .map(constants.GID)
    .concat(['concept_type', 'concept'])
    .sort()
    .value();
}

function getDomainGids(concepts) {
  return _.chain(concepts)
    .filter(concept => {
      return _.includes(constants.DEFAULT_ENTITY_GROUP_TYPES, _.get(concept, 'properties.concept_type', null));
    })
    .map(constants.GID)
    .value();
}

function getConceptOriginIdsByGids(concepts) {
  return _.chain(concepts)
    .keyBy(constants.GID)
    .mapValues(constants.ORIGIN_ID)
    .value();
}

function getConceptsByGids(concepts) {
  return _.keyBy(concepts, constants.GID);
}

function getConceptsByOriginIds(concepts) {
  return _.keyBy(concepts, constants.ORIGIN_ID);
}
