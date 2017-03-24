import * as _ from 'lodash';
import * as ddfQueryUtils from './ddf-query-utils';
import {constants} from '../ws.utils/constants';

const FUNCTION_OPERATORS = ['min', 'max', 'avg'];

export function normalize(query: any, options?: any): any {
  const safeQuery = ddfQueryUtils.toSafeQuery(query, {except: ['join']});

  switch(safeQuery.from) {
    case 'concepts.schema':
      return normalizeConceptsSchema(safeQuery, options);
    case 'entities.schema':
      return normalizeEntitiesSchema(safeQuery, options);
    case 'datapoints.schema':
      return normalizeDatapointsSchema(safeQuery, options);
    default:
      console.error(`Schema given in a "from" clause does not exist: ${safeQuery.from}`);
      return safeQuery;
  }
}

function normalizeConceptsSchema(query: any, options: any): any {
  return normalizeSchema(query, options);
}

function normalizeEntitiesSchema(query: any, options: any): any {
  return normalizeSchema(query, options);
}

function normalizeDatapointsSchema(query: any, options: any): any {
  return normalizeSchema(query, options);
}

function normalizeSchema(query: any, options: any): any {
  normalizeWhere(query, options);
  normalizeSelect(query);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query: any, options: any): void {
  const $andClause = [{type: toSchemaType(query.from)}];

  if (!_.isEmpty(_.keys(query.where))) {
    $andClause.push(query.where);
  }

  if (_.get(options, 'transactionId')) {
    $andClause.push({transaction: options.transactionId} as any);
  }

  query.where = {
    $and: $andClause
  };
}

function normalizeSelect(query: any): void {
  const selectWithAliases = _.chain(query.select.key)
    .union(query.select.value)
    .reduce((projection: any, field: string) => {
      const operator = toFunctionOperator(field);
      if (operator) {
        projection.aliases[operator] = field;
        projection.select[operator] = 1;
      } else {
        projection.select[field] = 1;
      }

      return projection;
    }, {select: {}, aliases: {}})
    .value();

  query.select = selectWithAliases.select;
  query.aliases = selectWithAliases.aliases;
}

function toSchemaType(from: string): string {
  switch(from) {
    case 'concepts.schema':
      return constants.CONCEPTS;
    case 'entities.schema':
      return constants.ENTITIES;
    case 'datapoints.schema':
      return constants.DATAPOINTS;
    default:
      console.error(`Cannot detect schema type based on given "from": ${from}`);
      return from;
  }
}

function toFunctionOperator(value: string): string {
  return _.find(FUNCTION_OPERATORS, (operator: string) => _.startsWith(value, `${operator}(`) || operator === value);
}
