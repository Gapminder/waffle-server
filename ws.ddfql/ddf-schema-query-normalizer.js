'use strict';

const _ = require('lodash');

const FUNCTION_OPERATORS = ['min', 'max', 'avg'];

module.exports = {
  normalize,
};

function normalize(query, options) {
  switch(query.from) {
    case 'concepts.schema':
      return normalizeConceptsSchema(query, options);
    case 'entities.schema':
      return normalizeEntitiesSchema(query, options);
    case 'datapoints.schema':
      return normalizeDatapointsSchema(query, options);
    default:
      console.error(`Schema given in a "from" clause does not exist: ${from}`);
      return query;
  }
}

function normalizeConceptsSchema(query, options) {
  normalizeWhere(query, options);
  normalizeSelect(query);
  return query;
}

function normalizeEntitiesSchema(query, options) {
  normalizeWhere(query, options);
  normalizeSelect(query);
  return query;
}

function normalizeDatapointsSchema(query, options) {
  normalizeWhere(query, options);
  normalizeSelect(query);
  return query;
}

function normalizeWhere(query, options) {
  const $andClause = [{type: toSchemaType(query.from)}];

  if (query.where) {
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
