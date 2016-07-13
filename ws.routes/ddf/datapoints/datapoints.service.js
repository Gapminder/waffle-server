'use strict';
const _ = require('lodash');
const async = require('async');
const constants = require('../../../ws.utils/constants');

const mongoose = require('mongoose');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

module.exports = {
  getConcepts,
  getEntities,
  getDataPoints
};

// pipe={headers, where, sort, dataset, version}
function getConcepts(pipe, cb) {
  return Concepts
    .find({
      dataset: pipe.dataset._id,
      from: {$lte: pipe.version},
      to: {$gt: pipe.version}
    })
    .lean()
    .exec((err, res) => {
      pipe.concepts = _.keyBy(res, constants.GID);
      pipe.conceptsByOriginId = _.keyBy(res, 'originId');

      pipe.selectedConcepts = _.pick(pipe.concepts, pipe.headers);

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
  let resolvedDimensionsGid = _.keys(_.assign({}, pipe.domains, pipe.sets));
  let resolvedFilters = _.chain(pipe.where)
    .pick(pipe.where, resolvedDimensionsGid)
    .mapKeys((value, key) => {
      return pipe.concepts[key].originId
    })
    .mapValues((dimension) => {
      return _.chain(dimension)
        .flatMap((value) => {
          if (!_.isArray(value)) {
            return [value];
          }
          return _.range(_.first(value), _.last(value) + 1)
        })
        .map(_.toString)
        .value();
    })
    .value();

  let query = {
    dataset: pipe.dataset._id,
    from: {$lte: pipe.version},
    to: {$gt: pipe.version},
    $or: [
      {
        domain: {$in: _.map(pipe.domains, 'originId')}
      },
      {
        sets: {$in: _.map(pipe.sets, 'originId')}
      }
    ]
  };

  return Entities
    .find(query)
    .lean()
    .exec((err, res) => {
      let filteredEntitiesGroupedByDomain = _.chain(res)
        .groupBy('domain')
        .mapValues((entities, domainOriginId) => {
          if (!_.isEmpty(resolvedFilters[domainOriginId])) {
            return _.chain(entities)
              .filter((entity) => {
                return _.includes(resolvedFilters[domainOriginId], entity[constants.GID]);
              })
              .map('originId')
              .value()
              .sort();
          }

          return _.map(entities, 'originId').sort();
        })
        .value();

      pipe.entitiesGroupedByDomain = filteredEntitiesGroupedByDomain;
      pipe.entities = _.keyBy(res, 'originId');
      return cb(null, pipe);
    });
}

function getDataPoints(pipe, cb) {
  console.time('get datapoints');
  if (_.isNil(pipe.measures)) {
    return cb(null, pipe);
  }
  let dimensions = _.defaults({}, pipe.domains, pipe.sets);
  let query = {
    dataset: pipe.dataset._id,
    from: {$lte: pipe.version},
    to: {$gt: pipe.version},
    measure: {$in: _.map(pipe.measures, 'originId')},
    dimensions: {
      $size: _.size(dimensions),
      $all: _.map(dimensions, (entitySet) => {
        const domainOriginId = _.isEmpty(entitySet.domain) ? entitySet.originId : entitySet.domain;
        return {$elemMatch: { $in: pipe.entitiesGroupedByDomain[_.toString(domainOriginId)]}}
      })
    }
  };

  return DataPoints.find(query)
    .lean()
    .exec((err, res) => {
      console.timeEnd('get datapoints');

      pipe.datapoints = res;

      return cb(null, pipe);
    });
}
