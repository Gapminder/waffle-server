'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');
const defaultDrillups = require('./default-drillups');

const DimensionValues = mongoose.model('DimensionValues');

const EMPTY_SUGGESTION = {
  entities: [],
  entityConcepts: []
};

module.exports = {
  isApplicable: chartState => !_.isEmpty(chartState.entities) && chartState.entities.length === 1,
  process: (chartState, onRuleProcessed) => {
    return async.waterfall([
      initSuggestionWithParentConcepts(_.head(chartState.entities)),
      (suggestionFragment, done) => extendSuggestionWithParentEntities(suggestionFragment, done)
    ], (error, suggestion) => {
      if (error === 'break') {
        return onRuleProcessed(null, EMPTY_SUGGESTION);
      }
      return onRuleProcessed(error, suggestion);
    });
  }
};

function initSuggestionWithParentConcepts(selectedEntity) {
  return done => {
    const query = {value: selectedEntity};
    const projection = {parentGid: 1, dimensionGid: 1, _id: 0};

    return DimensionValues
      .findOne(query, projection)
      .lean()
      .exec((error, dimensionValue) => {
        if (doesNotHaveParentOrParentToItself(dimensionValue)) {
          return done('break');
        }

        const parentDimension = defaultDrillups[dimensionValue.dimensionGid];

        const suggestionFragment = {
          entities: [selectedEntity],
          activeEntities: [selectedEntity],
          entityConcepts: [parentDimension],
          ownDimension: dimensionValue.dimensionGid,
          parentGid: dimensionValue.parentGid
        };

        return done(error, suggestionFragment);
    })
  };

  function doesNotHaveParentOrParentToItself(dimensionValue) {
    return !dimensionValue.parentGid || dimensionValue.parentGid === selectedEntity;
  }
}

function extendSuggestionWithParentEntities(suggestion, done) {
  const query = {dimensionGid: {$in: suggestion.entityConcepts}};
  const projection = {value: 1, _id: 0};

  return DimensionValues
    .find(query, projection)
    .lean()
    .exec((error, dimensionValue) => {
      let suggestionFragment = {
        entities: _.map(dimensionValue, 'value'),
        entityConcepts: [suggestion.ownDimension],
        activeEntities: _.concat(suggestion.activeEntities, suggestion.parentGid)
      };

      return done(error, merge(_.omit(suggestion, 'parentGid', 'ownDimension'), suggestionFragment));
  });

  function merge(suggestion, suggestionFragment) {
    return _.mergeWith({}, suggestion, suggestionFragment, (a, b) => {
      if (_.isArray(a)) {
        return _.union(a, b);
      }
    });
  }
}

