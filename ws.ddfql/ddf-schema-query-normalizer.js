'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const constants = require('../ws.utils/constants');
const ddfQueryUtils = require('./ddf-query-utils');

const FUNC_OPERATOR_REGEX = /(max|min|avg)\((.*)\)/g;

const SUPPORTED_SCHEMAS = new Set(['datapoints.schema', 'concepts.schema', 'entities.schema']);

module.exports = {
  normalize,
  normalizeJoin,
  substituteJoinLinks,
  calcNormalizedQueriesAmount
};

function calcNormalizedQueriesAmount(query, linksInJoinToValues) {
  const varToValue = _.pick(linksInJoinToValues, linksForKey(query, linksInJoinToValues));
  return _.reduce(_.values(varToValue), (result, vals) => result * _.size(vals), 1);
}

function substituteJoinLinks(query, linksInJoinToValues) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);
  const filteredJoin = _.omit(safeQuery.join, linksForKey(query, linksInJoinToValues));

  traverse(safeQuery.where).forEach(function (link) {
    if (filteredJoin.hasOwnProperty(link)) {
      const id = linksInJoinToValues[link];
      this.update(id ? {$in: id} : link);
    }
  });
  if (_.isEmpty(safeQuery.join)) {
    delete safeQuery.join;
  }
  return safeQuery;
}

function normalize(query, options) {
  const safeQuery = ddfQueryUtils.toSafeQuery(query);

  if (SUPPORTED_SCHEMAS.has(safeQuery.from)) {
    return normalizeMany(safeQuery, options);
  }

  return Error(`Schema given in a "from" clause does not exist: ${safeQuery.from}`);
}

function normalizeMany(query, options) {
  const linksInJoinToValues = _.get(options, 'linksInJoinToValues', {});
  const patternVarSets = computePatternVarsToReplaceInQuery(query, linksInJoinToValues);

  normalizeWhere(query, options);
  substituteJoinLinks(query, linksInJoinToValues);
  ddfQueryUtils.normalizeOrderBy(query);

  if (_.isEmpty(patternVarSets)) {
    normalizeSelect(query, {});
    return [query];
  }

  return _.map(patternVarSets, patternVarSet => {
    const queryClone = _.cloneDeep(query);

    traverse(queryClone.where).forEach(function(value) {
      if (patternVarSet[value]) {
        this.update(patternVarSet[value]);
      }
    });

    normalizeSelect(queryClone, patternVarSet);
    return queryClone;
  });
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

function normalizeSelect(query, templateVars) {
  const selectAndAliases = _.chain(query.select.key)
    .union(query.select.value)
    .reduce((projection, field) => {
      const operator = toFunctionOperator(field, templateVars);
      if (operator) {
        projection.select[operator] = 1;
        projection.aliases[operator] = field;
      } else {
        projection.select[field] = 1;
      }
      return projection;
    }, {select: {}, aliases: {}})
    .value();

  query.select = selectAndAliases.select;
  query.aliases = selectAndAliases.select;

  return _.extend(query, selectAndAliases);
}

function normalizeJoin(query) {
  traverse(query.join).forEach(function (filterValue) {
    let normalizedFilter = null;

    if (_.includes(this.path, 'where') && this.key != 'where') {
        normalizedFilter = {
          [ddfQueryUtils.wrapEntityProperties(this.key)]: filterValue,
        };
    }

    if (this.key === 'key') {
      // we wanna send join queries only to concepts
      this.remove();
      return;
    }

    if (normalizedFilter) {
      ddfQueryUtils.replaceValueOnPath({
        key: this.key,
        path: this.path,
        normalizedValue: normalizedFilter,
        queryFragment: query.join
      });
    }
  });

  ddfQueryUtils.pullUpWhereSectionsInJoin(query);
  return query;
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

function getLinksUsedInSelect(select) {
  if (select && select.value) {
    return _.compact(_.map(select.value, extractLinkFromDdfQlFunction));
  }
  return [];
}

function extractLinkFromDdfQlFunction(value) {
  if (!FUNC_OPERATOR_REGEX.test(value)) {
    return null;
  }

  const maybeLink = _.replace(value, FUNC_OPERATOR_REGEX, (match, func, param) => {
    return param;
  });

  if (_.startsWith(maybeLink, '$')) {
    return maybeLink;
  }

  return null;
}

function toFunctionOperator(value, templateVars) {
  if (!FUNC_OPERATOR_REGEX.test(value)) {
    return null;
  }

  const actualStoredValue = _.replace(value, FUNC_OPERATOR_REGEX, (match, func, param) => {
    if (param == 'value') {
      return `${func}(value)`;
    }
    return `${func}(${templateVars[param] || param})`;
  });

  return actualStoredValue === value ? null : actualStoredValue;
}

function computePatternVarsToReplaceInQuery(query, linksInJoinToValues)  {
  if (!linksInJoinToValues) {
    return [];
  }

  const keyLinks = linksForKey(query, linksInJoinToValues);

  const vars = _.chain(query.join)
    .pick(keyLinks)
    .mapValues((value, key) => _.map(linksInJoinToValues[key], value => ({[key]: value})))
    .values()
    .value();

  return _.map(cartesianProduct.apply(null, vars), varsSet => _.reduce(varsSet, (acc, current) => _.extend(acc, current), {}));
}

function cartesianProduct() {
  function addNextList (tuples, list) {
    const result = [];
    tuples.forEach(tuple => {
      list.forEach(item => {
        result.push(tuple.concat(item));
      });
    });
    return result;
  }

  const lists = Array.prototype.slice.call(arguments, 0);
  return lists.reduce(addNextList, [[]]);
}

function linksForKey(query, linksInJoinToValues) {
  const linksUsedInSelect = getLinksUsedInSelect(query.select);

  const links = new Set(linksUsedInSelect);
  traverse(query.where).forEach(function (value) {
    if (linksInJoinToValues[value] && _.includes(this.path, 'key')) {
      links.add(value);
    }
  });

  return Array.from(links);
}
