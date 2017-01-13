import * as _ from 'lodash';
import * as async from 'async';
import * as mingo from 'mingo';
import * as traverse from 'traverse';

import {constants} from '../ws.utils/constants';

const AVAILABLE_QUERY_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$or', '$and', '$not', '$nor', '$size', '$all', '$elemMatch']);
const SORT_DIRECTIONS = new Set([constants.ASC_SORTING_DIRECTION, constants.DESC_SORTING_DIRECTION]);
const MAX_AMOUNT_OF_MEASURES_IN_SELECT = 5;

const VALID_RESPONSE = {
  valid: true
};

interface ValidateQueryModel {
  valid: boolean;
  messages?: Array<string>;
  log?: string;
}

export {
  validateMongoQuery,
  validateDdfQuery,
  validateDdfQueryAsync,
  ValidateQueryModel
};

function validateDdfQueryAsync(pipe, onValidated) {
  return async.setImmediate(() => {
    const result = validateDdfQuery(pipe.query);
    if (!result.valid) {
      return onValidated(result.log, pipe);
    }
    return onValidated(null, pipe);
  });
}

// correct Query Structure by Mingo
// correct operators by List of Available Items

function validateMongoQuery(query) {
  let mQuery;
  const errorMessages = [];

  try {
    mQuery = new mingo.Query(query);
  } catch(error) {
    errorMessages.push("Invalid DDFQL-query. Validated by Mingo, " + error.toString());
    return createResponse(errorMessages);
  }

  // validate by mingo
  if(!mQuery) {
    errorMessages.push("Invalid DDFQL-query. Validated by Mingo, Error: Structure");
    return createResponse(errorMessages);
  }

  // validate by available operators
  traverse(query).forEach(function() {
    if(this.key) {
      const key = _.toString(this.key);
      if(isInvalidQueryOperator(key)) {
        errorMessages.push("Invalid DDFQL-query. Validation by Operators, not acceptable: " + key);
      }
    }
  });

  return createResponse(errorMessages);
}

// where :: not contain '.'
// join :: all first level properties contain "$"

function validateDdfQuery (query) {
  return applyValidators(query, [
    _validateDdfQueryWhereClause,
    _validateDdfQueryJoinClause,
    _validateDdfQuerySelectClause,
    _validateDdfQueryOrderByClause
  ]);
}


function applyValidators(query, validators: Function[]) {
  if (_.isEmpty(validators)) {
    return VALID_RESPONSE;
  }

  const validate = _.head(validators);
  const operationResult = validate(query);
  if (!operationResult.valid) {
    return operationResult;
  }

  return applyValidators(query, _.tail(validators));
}

function _validateDdfQueryWhereClause(query) {
  const errorMessages = traverse(_.get(query, 'where', {})).reduce(function(errors) {
    if(this.key) {
      const key = _.toString(this.key);
      if(_.includes(key, ".")) {
        errors.push("Invalid DDFQL-query. Validation of Where Clause: contain '.' in " + key);
      }
    }

    return errors;
  }, []);

  return createResponse(errorMessages);
}

function _validateDdfQueryJoinClause(query) {
  const errorMessages =
    _.chain(_.get(query, 'join')).keys().reduce((errors, key) => {
      if(!_.startsWith(key, "$")) {
        errors.push("Invalid DDFQL-query. Validation of Join Clause: does not contain '$' in " + key);
      }
      return errors;
    }, [])
      .value();

  return createResponse(errorMessages);
}

function _validateDdfQuerySelectClause(query) {
  query = _.defaults(query, {
    select: {},
    from: ''
  });

  const errors = [];

  if (!query.select.key) {
    errors.push("Invalid DDFQL-query. Validation of Select Clause: does not contain 'key'");
  }

  if (query.from === constants.DATAPOINTS && _.size(query.select.value) > MAX_AMOUNT_OF_MEASURES_IN_SELECT) {
    errors.push(`Invalid DDFQL-query. Validation of Select Clause: 'value' contains more than ${MAX_AMOUNT_OF_MEASURES_IN_SELECT} measures, please try again with less amount`);
  }

  return createResponse(errors);
}

function _validateDdfQueryOrderByClause(query) {
  query = _.defaults(query, {
    order_by: []
  });

  const errorMessages = [];
  if (!_.isArray(query.order_by)) {
    errorMessages.push(createOrderByErrorMessage(`order_by should contain an array. Was: ${JSON.stringify(query.order_by)}`));
  }

  const propertiesAvailableForSorting = new Set(_.concat(_.get(query, 'select.key', []), _.get(query, 'select.value', [])));

  _.reduce(query.order_by, (errorMessages, orderByItem: any) => {
    if (_.isNil(orderByItem)) {
      errorMessages.push(createOrderByErrorMessage('order_by should not contain empty values'));
    }

    if (_.isArray(orderByItem)) {
      errorMessages.push(createOrderByErrorMessage('order_by cannot contain arrays as its elements'));
    }

    if (!_.isString(orderByItem) && !_.isObject(orderByItem)) {
      errorMessages.push(createOrderByErrorMessage('order_by should contain only string and objects'));
    }

    if (_.isObject(orderByItem)) {
      if (_.size(orderByItem) !== 1) {
        errorMessages.push(createOrderByErrorMessage(
          `object in order_by clause should contain only one key. Was ${JSON.stringify(_.keys(orderByItem))}`)
        );
      }

      const allSortDirectionAreValid = _.every(orderByItem, sortDirection => SORT_DIRECTIONS.has(sortDirection));

      if (!allSortDirectionAreValid) {
        errorMessages.push(createOrderByErrorMessage(
          `object in order_by clause should contain only following sort directions: 'asc', 'desc'. Was ${JSON.stringify(orderByItem)}`)
        );
      }

      const allPropertiesAreAvailableForSorting = _.every(orderByItem, (sortDirection, property) => propertiesAvailableForSorting.has(property));

      if (!allPropertiesAreAvailableForSorting) {
        errorMessages.push(createOrderByErrorMessage(
          `order_by clause should contain only properties from select.key and select.value. Was ${JSON.stringify(orderByItem)}`)
        );
      }
    }

    return errorMessages;
  }, errorMessages);

  return createResponse(errorMessages);
}

function createResponse (errorMessages) {
  if(_.isEmpty(errorMessages)) {
    return VALID_RESPONSE;
  }

  return _.extend({}, VALID_RESPONSE, {
    valid: false,
    messages: errorMessages,
    log: _.join(errorMessages, "; ")
  });
}

function isInvalidQueryOperator(operator) {
  return _.startsWith(operator, "$") && !AVAILABLE_QUERY_OPERATORS.has(operator);
}

function createOrderByErrorMessage(message) {
  return `Invalid DDFQL-query. Validation of order_by clause: ${message}`;
}
