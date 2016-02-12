'use strict';

const _ = require('lodash');
const async = require('async');

const rules = require('./rules');

const MAX_NUMBER_OF_RULES_PROCESSED_IN_PARALLEL = 10;

module.exports = {
  getSuggestionsBasedOn
};

function getSuggestionsBasedOn(currentState, onSuggestionsGenerated) {
  let applicableRules = _.keys(rules).filter((ruleId) => {
    return rules[ruleId].isApplicable(currentState);
  });

  let ruleProcessingTasks = applicableRules.map((ruleId) => {
      return {
        [ruleId]: (cb) => rules[ruleId].process(currentState, cb)
      }
  })
  .reduce((prev, result) => {
    return _.mergeWith(result, prev);
  }, {});

  return async.parallelLimit(ruleProcessingTasks, MAX_NUMBER_OF_RULES_PROCESSED_IN_PARALLEL, (error, suggestions) => {
    return onSuggestionsGenerated(error, suggestions);
  });
}
