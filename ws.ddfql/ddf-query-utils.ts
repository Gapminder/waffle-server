import * as ddfTimeUtils from 'ddf-time-utils';
import * as _ from 'lodash';
import * as traverse from 'traverse';
import { constants } from '../ws.utils/constants';

export {
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

// const normalizeKey = _.flow([cutPrefixByDot as Function, _.partialRight(_.split, '.'), _.first, cutPrefixByDashes]);
function normalizeKey(value: string, prefix: any): string {
  let result: any = cutPrefixByDot(value, prefix);
  result = _.split(result, '.');
  result = _.first(result);
  result = cutPrefixByDashes(result);
  return result;
}

function toSafeQuery(query: any, options?: any): any {
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

function replaceValueOnPath(options: any): void {
  // we need to do a step back in path
  options.path.pop();
  const path = options.path;

  const key = options.key;
  const normalizedValue = options.normalizedValue;
  const queryFragment = options.queryFragment;

  const value = _.get(queryFragment, path);

  if (!value) {
    return;
  }

  if (options.substituteEntryWithItsContent) {
    const content = value[key];
    delete value[key];
    _.defaultsDeep(value, content);
  } else {
    delete value[key];
    _.set(queryFragment, path, _.defaultsDeep(value, normalizedValue));
  }
}

function normalizeOrderBy(query: any): void {
  if (!_.isArray(query.order_by)) {
    return;
  }

  query.order_by = _.map(query.order_by, (statement: any) => {
    if (_.isObject(statement)) {
      return statement;
    }

    return { [statement]: constants.ASC_SORTING_DIRECTION };
  });
}

function normalizeTimePropertyFilter(key: string, filterValue: any, path: string[], query: any): any {
  let timeType = '';
  const normalizedFilter = {
    'time.millis': traverse(filterValue).map(function (value: any): any {
      /* tslint:disable: no-invalid-this */
      if (this.notLeaf) {
        return value;
      }

      if (_.isObject(value) && _.isEmpty(value)) {
        return value;
      }

      const timeDescriptor = ddfTimeUtils.parseTime(value);
      timeType = timeDescriptor.type;
      return timeDescriptor.time;
      /* tslint:enable: no-invalid-this */
    })
  };

  // always set latest detected time type
  const conditionsForTimeEntities = _.get(query, path.slice(0, path.length - 1), []);
  conditionsForTimeEntities['time.timeType'] = timeType;

  return normalizedFilter;
}

function isTimePropertyFilter(key: string, timeConceptsGids: string[]): boolean {
  return _.includes(timeConceptsGids, key);
}

function isDomainPropertyFilter(key: string, options: any): boolean {
  return _.includes(options.domainGids, key);
}

function convertOrderByForWsJson(orderBy: any, headers: string[]): any {
  const propertyIndexToSortDirection = _.map(orderBy, (sortDescriptor: any) => {
    const propertyToSort = _.first(_.keys(sortDescriptor));
    const propertyToSortIndex = _.findIndex(headers, (header: string) => propertyToSort === header);
    return [String(propertyToSortIndex), sortDescriptor[propertyToSort]];
  });

  const unzippedPropertyIndexToSortDirection = _.unzip(propertyIndexToSortDirection);

  return {
    columnsToSort: _.first(unzippedPropertyIndexToSortDirection),
    columnsSortDirections: _.last(unzippedPropertyIndexToSortDirection)
  };
}

function isEntityPropertyFilter(key: string, options: any): boolean {
  return _.includes(options.conceptGids, normalizeKey(key, options.domainGids));
}

function getPrefixByDot(value: string): string {
  return _.first(_.split(value, '.'));
}

function cutPrefixByDot(value: string, prefix?: any): string {
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

function cutPrefixByDashes(value: string): string {
  return _.replace(value, /^is--/, '');
}

function wrapEntityProperties(key: string, options: any): string {
  const propertyName = cutPrefixByDot(key, options.domainGids);

  if (!isTimePropertyFilter(key, options) && isEntityPropertyFilter(propertyName, options)) {
    return `properties.${propertyName}`;
  }

  return propertyName;
}

function getConceptGids(concepts: ReadonlyArray<any>): string[] {
  return _.chain(concepts)
    .map(constants.GID)
    .concat(['concept_type', 'concept'])
    .sort()
    .value();
}

function getDomainGids(concepts: ReadonlyArray<any>): any[] {
  return _.chain(concepts)
    .filter((concept: any) => {
      return _.includes(constants.DEFAULT_ENTITY_GROUP_TYPES, _.get(concept, 'properties.concept_type', null));
    })
    .map(constants.GID)
    .value();
}

function getConceptOriginIdsByGids(concepts: ReadonlyArray<any>): any {
  return _.chain(concepts)
    .keyBy(constants.GID)
    .mapValues(constants.ORIGIN_ID)
    .value();
}

function getConceptsByGids(concepts: ReadonlyArray<any>): any {
  return _.keyBy(concepts, constants.GID);
}

function getConceptsByOriginIds(concepts: ReadonlyArray<any>): any {
  return _.keyBy(concepts, constants.ORIGIN_ID);
}
