'use strict';

const _ = require('lodash');
const ddfQueryUtils = require('./ddf-query-utils');

const FUNCTION_OPERATORS = ['min', 'max', 'avg'];

module.exports = {
  normalize,
};

function normalize(query, options) {
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

function normalizeConceptsSchema(query, options) {
  return normalizeSchema(query, options);
}

function normalizeEntitiesSchema(query, options) {
  return normalizeSchema(query, options);
}

function normalizeDatapointsSchema(query, options) {
  return normalizeSchema(query, options);
}

function normalizeSchema(query, options) {
  normalizeWhere(query, options);
  normalizeSelect(query);
  ddfQueryUtils.normalizeOrderBy(query);
  return query;
}

function normalizeWhere(query, options) {
  const $andClause = [{type: toSchemaType(query.from)}];

  if (!_.isEmpty(_.keys(query.where))) {
    $andClause.push(query.where);
  }

  if (_.get(options, 'transactionId')) {
    $andClause.push({transaction: options.transactionId});
  }

  query.where = {
    $and: $andClause
  };
}

function normalizeSelect(query) {
  const selectWithAliases = _.chain(query.select.key)
    .union(query.select.value)
    .reduce((projection, field) => {
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

function toSchemaType(from) {
  switch(from) {
    case 'concepts.schema':
      return 'concepts';
    case 'entities.schema':
      return 'entities';
    case 'datapoints.schema':
      return 'datapoints';
    default:
      console.error(`Cannot detect schema type based on given "from": ${from}`);
      return from;
  }
}

function toFunctionOperator(value) {
  return _.find(FUNCTION_OPERATORS, operator => _.startsWith(value, `${operator}(`) || operator === value);
}
