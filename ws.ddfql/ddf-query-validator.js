'use strict';

const _ = require('lodash');
const async = require('async');
const mingo = require('mingo');
const traverse = require('traverse');
const AVAILABLE_QUERY_OPERATORS = ["$eq", "$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin", "$or", "$and", "$not", "$nor", "$size"];

const VALID_RESPONSE = {
  valid: true
};

module.exports = {
  validateMongoQuery,
  validateDdfQuery,
  validateDdfQueryAsync
};

function validateDdfQueryAsync(pipe, onValidated) {
  return async.setImmediate(() => {
    const result = validateDdfQuery(pipe.query);
    if(!result.valid) {
      return onValidated(result.log, pipe);
    }
    return onValidated(null, pipe);
  })
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
  traverse(query).map(function(item) {
    if(this.key) {
      const key = _.toString(this.key);
      if(_.includes(key, "$") && !_.includes(AVAILABLE_QUERY_OPERATORS, key)) {
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
    _validateDdfQuerySelectClause
  ]);
}


function applyValidators(query, validators) {
  if (_.isEmpty(validators)) {
    return VALID_RESPONSE;
  }

  const validate = _.head(validators);
  const operationResult = validate(query);
  if (!operationResult.valid) {
    return operationResult;
  }

  return applyValidators(query, _.tail(validators))
}

function _validateDdfQueryWhereClause(query) {
  const errorMessages = traverse(_.get(query, 'where', {})).reduce(function(errors, item) {
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
  const clause = _.get(query, 'select', {});
  return !clause.key
    ? createResponse(["Invalid DDFQL-query. Validation of Select Clause: does not contain 'key'"])
    : createResponse([]);
}

function createResponse (errorMessages) {
  if(_.isEmpty(errorMessages)) {
    return VALID_RESPONSE;
  }

  return _.extend({}, VALID_RESPONSE, {
    valid: false,
    messages: errorMessages,
    log: errorMessages.join("; ")
  });
}
