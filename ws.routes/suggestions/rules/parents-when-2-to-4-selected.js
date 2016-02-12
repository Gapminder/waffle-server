'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');
const defaultDrillups = require('./default-drillups');

const DimensionValues = mongoose.model('DimensionValues');

module.exports = {
  isApplicable: chartState => !_.isEmpty(chartState.entities) && chartState.entities.length > 1 && chartState.entities.length < 4,
  process: (chartState, onRuleProcessed) => {
    return async.waterfall([
      initSuggestionWithActiveEntitiesAndParentConcepts(chartState.entities),
      (suggestionFragment, done) => extendSuggestionWithParentEntities(suggestionFragment, done)
    ], onRuleProcessed);
  }
};

function initSuggestionWithActiveEntitiesAndParentConcepts(selectedEntities) {
  return done => {
    const query = {value: {$in: selectedEntities}};
    const projection = {parentGid: 1, dimensionGid: 1, _id: 0};

    return DimensionValues
      .find(query, projection)
      .lean()
      .exec((error, dimensionValues) => {
        const activeEntities =
          _.chain(dimensionValues)
          .map(value => value.parentGid)
          .union(selectedEntities)
          .value();

        const entityConcepts = _.map(dimensionValues, value => defaultDrillups[value.dimensionGid]);

        const ownGids = _.map(dimensionValues, 'dimensionGid');

       return done(error, {entities: selectedEntities, activeEntities, entityConcepts, ownGids});
    })
  }
}

function extendSuggestionWithParentEntities(suggestion, done) {
  const query = {dimensionGid: {$in: suggestion.entityConcepts}};
  const projection = {value: 1, _id: 0};

  return DimensionValues
    .find(query, projection)
    .lean()
    .exec((error, dimensionValues) => {
      const suggestionFragment = {
        entities: _.map(dimensionValues, 'value'),
        entityConcepts: suggestion.ownGids
      };

      return done(error, merge(_.omit(suggestion, 'ownGids'), suggestionFragment));
  });

  function merge(suggestion, suggestionFragment) {
    return _.mergeWith({}, suggestion, suggestionFragment, function(a, b) {
      if (_.isArray(a)) {
        return _.union(a, b);
      }
    });
  }
}
