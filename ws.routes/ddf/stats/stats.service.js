'use strict';
var _ = require('lodash');
var async = require('async');

const mongoose = require('mongoose');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

module.exports = {
  getConcepts,
  getEntities,
  getDataPoints,
  mapResult
};

// pipe={select, where, sort, dataset, version}
function getConcepts(pipe, cb) {
  return Concepts
    .find({
      dataset: pipe.dataset,
      from: {$lte: pipe.version},
      to: {$gt: pipe.version}
    })
    .lean()
    .exec((err, res) => {
      pipe.concepts = _.keyBy(res, 'gid');

      pipe.selectedConcepts = _.pick(pipe.concepts, pipe.select);

      if (_.isEmpty(pipe.selectedConcepts)) {
        return cb(`You didn't select any column`);
      }

      pipe.measures = _.pickBy(pipe.selectedConcepts, ['type', 'measure']);
      pipe.domains = _.pickBy(pipe.selectedConcepts, ['type', 'entity_domain']);
      pipe.sets = _.pickBy(pipe.selectedConcepts, ['type', 'entity_set']);
      pipe.dimensions = _.pick(pipe.concepts, _.keys(pipe.where));
      let wrongConcepts = _.chain(pipe.selectedConcepts)
        .pickBy(_.isNil)
        .keys()
        .join(', ')
        .value();

      if (wrongConcepts) {
        return cb(`You select column(s) '${wrongConcepts}' which aren't present in choosen dataset`);
      }

      return cb(null, pipe);
    });
}

function getEntities(pipe, cb) {
  let subqueryGids = {$exists: true};
  let resolvedGids = _.chain(pipe.where)
    .flatMap((dimension) => {
      if (_.some(dimension, _.isArray)) {
        return _.flatMap(dimension, (value) => _.range(_.first(value), _.last(value) + 1));
      }

      return dimension;
    })
    .value();

  if (!_.isEmpty(resolvedGids)) {
    subqueryGids = {$in: resolvedGids};
  }

  let query = {
    gid: subqueryGids,
    dataset: pipe.dataset,
    from: {$lte: pipe.version},
    to: {$gt: pipe.version},
    $or: [
      {domain: {$in: _.map(pipe.domains, 'originId')}},
      {sets: {$in: _.map(pipe.sets, 'originId')}},
    ]
  };

  return Entities
    .find(query)
    .lean()
    .exec((err, res) => {
      pipe.entities = res;
      return cb(null, pipe);
    });
}

function getDataPoints(pipe, cb) {
  if (_.isNil(pipe.measures)) {
    return cb(null, pipe);
  }

  return DataPoints.find({
      measure: {$in: _.map(pipe.measures, 'originId')},
      dataset: pipe.dataset,
      from: {$lte: pipe.version},
      to: {$gt: pipe.version},
    })
    .lean()
    .exec((err, res) => {
      pipe.datapoints = res;
      return cb(null, pipe);
    });
}

function mapResult(pipe, cb) {
  let rows = [];
  let measuresByOriginId = _.keyBy(pipe.measures, 'originId');

  // let datapointsByDimensions = _.groupBy();
  // let datapointsByMeasure = _.groupBy(pipe.datapoints, (datapoint) => {
  //   return measuresByOriginId[datapoint.measure].gid;
  // });

  pipe.result = { header: pipe.select, rows: rows };

  return async.setImmediate(() => {
    return cb(null, pipe);
  });
}
