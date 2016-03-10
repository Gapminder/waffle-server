'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const Dimensions = mongoose.model('Dimensions');
const DimensionValues = mongoose.model('DimensionValues');

module.exports = {
  isApplicable: chartState => !_.isEmpty(chartState.entities) && chartState.entities.length === 1,
  process: (chartState, onRuleProcessed) =>
    async.waterfall([
      inferDimensionGidsFrom(chartState.entities),
      (dimensionGids, done) => inferDimensionDrilldownsFrom(dimensionGids, done),
      (drilldowns, done) => findEntitiesAndTheirConceptsForSuggestionUsing(drilldowns, chartState.entities, done)
    ], onRuleProcessed)
};

function inferDimensionGidsFrom(entities) {
  return done => {
    const query = {value: {$in: entities}};
    const projection = {dimensionGid: 1, _id: 0};

    return DimensionValues
      .find(query, projection)
      .lean()
      .exec((error, result) => done(error, _.map(result, 'dimensionGid')));
  }
}

function inferDimensionDrilldownsFrom(dimensionGids, done) {
  const query = {gid: {$in: dimensionGids}};
  const projection = {drilldowns: 1, _id: 0};

  return Dimensions
    .find(query, projection)
    .lean()
    .exec((error, dimensions) => {
      const drilldowns =
        _.chain(dimensions)
          .map('drilldowns')
          .split(',')
          .compact()
          .map(drilldownItem => _.trim(drilldownItem))
          .value();

      return done(error, drilldowns);
  });
}

function findEntitiesAndTheirConceptsForSuggestionUsing(drilldowns, entities, done) {
  const query = {
    parentGid: {$in: entities},
    dimensionGid: {$in: drilldowns}
  };

  const projection = {value: 1, _id: 0};

  return DimensionValues
    .find(query, projection)
    .lean()
    .exec((error, result) => {
      const suggestionFragment = {
        entities: _.map(result, 'value'),
        entityConcepts: drilldowns
      };
      return done(error, suggestionFragment);
  });
}
