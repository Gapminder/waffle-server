'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const Dimensions = mongoose.model('Dimensions');
const DimensionValues = mongoose.model('DimensionValues');

module.exports = {
  isApplicable: chartState => {
    const nonSelected = _.isEmpty(chartState.entities);
    const fourOrMoreSelected = !_.isEmpty(chartState.entities) && chartState.entities.length >= 4;
    return nonSelected || fourOrMoreSelected;
  },
  process: (chartState, onRuleProcessed) => {
    return async.waterfall([
      inferConceptsFromSelectedEntities(chartState),
      (entityConcepts, done) => inferDrillupsBasedOn(entityConcepts, done),
      (drillups, done) => extendSuggestionFragmentWithDrillupEntities(drillups, done)
    ], onRuleProcessed);
  }
};

function inferConceptsFromSelectedEntities(chartState) {
  return done => {
    const query = {value: {$in: chartState.entities}};
    const projection = {dimensionGid: 1, _id: 0};

    return DimensionValues
      .find(query, projection)
      .lean()
      .exec((error, dimensionValues) => {
        const concepts =
          _.chain(dimensionValues)
          .map('dimensionGid')
          .union(chartState.entityConcepts)
          .value();

        done(error, concepts);
      });
  }
}

function inferDrillupsBasedOn(entityConcepts, done) {
  const query = {gid: {$in: entityConcepts}};
  const projection = {drillups: 1, _id: 0};

  return Dimensions
    .find(query, projection)
    .lean()
    .exec((error, dimensions) => {
      const drillups =
      _.chain(dimensions)
        .map('drillups')
        .split(',')
        .compact()
        .map(drillupItem => _.trim(drillupItem))
        .uniq()
        .value();

    return done(error, drillups);
  });
}

function extendSuggestionFragmentWithDrillupEntities(drillups, done) {
  const query = {dimensionGid: {$in: drillups}};
  const projection = {value: 1, _id: 0};
    return DimensionValues
      .find(query, projection)
      .lean()
      .exec((error, result) => {
        const suggestionFragment = {
          entities: _.map(result, 'value'),
          entityConcepts: drillups
        };

        return done(error, suggestionFragment);
  });
}
