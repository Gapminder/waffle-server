'use strict';
var _ = require('lodash');
var async = require('async');

const mongoose = require('mongoose');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

module.exports = {
  getDataset,
  getVersion,
  getConcepts,
  getEntities,
  getDataPoints,
  mapResult
};

function getDataset(pipe, done) {
  let query = { name: pipe.datasetName };
  mongoose.model('Datasets').findOne(query)
    .lean()
    .exec((err, res) => {
      pipe.dataset = res;
      return done(err, pipe);
    });
}

function getVersion(pipe, done) {
  let query = {dataset: pipe.dataset._id};

  if (pipe.version) {
    query.createdAt = pipe.version;
  }

  mongoose.model('DatasetTransactions').find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((err, res) => {
      pipe.transaction = _.first(res);
      pipe.version = pipe.transaction.createdAt;
      return done(err, pipe);
    });
}


// pipe={select, where, sort, dataset, version}
function getConcepts(pipe, cb) {
  return Concepts
    .find({
      dataset: pipe.dataset._id,
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
  let resolvedDimensionsGid = _.keys(_.assign({}, pipe.domains, pipe.sets));
  let resolvedFilters = _.chain(pipe.where)
    .pick(pipe.where, resolvedDimensionsGid)
    .mapKeys((value, key) => {
      return pipe.concepts[key].originId
    })
    .mapValues((dimension) => {
      if (_.some(dimension, _.isArray)) {
        return _.chain(dimension)
          .flatMap((value) => {
            if (!_.isArray(value)) {
              return [value];
            }
            return _.range(_.first(value), _.last(value) + 1)
          })
          .map(_.toString)
          .value();
      }

      return dimension;
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
                return resolvedFilters[domainOriginId].indexOf(entity.gid) > -1;
              })
              .map('originId')
              .value()
              .sort();
          }

          return _.map(entities, 'originId').sort();
        })
        .value();

      pipe.entities = filteredEntitiesGroupedByDomain;
      return cb(null, pipe);
    });
}

function getDataPoints(pipe, cb) {
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
        let domainOriginId = entitySet.domain ? entitySet.domain.originId : entitySet.originId
        return {$elemMatch: { $in: pipe.entities[domainOriginId]}}
      })
    }
  };
  return DataPoints.find(query, null, {
    join: {
      dimensions: {
        $find: {
          dataset: pipe.dataset._id,
          from: {$lte: pipe.version},
          to: {$gt: pipe.version}
        },
        $options: {
          join: {
            domain: {
              $find: {
                dataset: pipe.dataset._id,
                from: {$lte: pipe.version},
                to: {$gt: pipe.version}
              }
            }
          }
        }
      },
      measure: {
        $find: {
          dataset: pipe.dataset._id,
          from: {$lte: pipe.version},
          to: {$gt: pipe.version}
        }
      }
    }
  })
    .lean()
    .exec((err, res) => {
      pipe.datapoints = res;
      return cb(null, pipe);
    });
}

function mapResult(pipe, cb) {
  // let measuresByOriginId = _.keyBy(pipe.measures, 'originId');
  let rows = _.chain(pipe.datapoints)
    .reduce((result, datapoint) => {
      let complexKey = _.chain(datapoint.dimensions)
        .sortBy((dimension) => pipe.select.indexOf(dimension.domain.gid))
        .map('gid')
        .join(':')
        .value();

      if (!result[complexKey]) {
        result[complexKey] = {};
        _.each(datapoint.dimensions, (dimension) => {
          result[complexKey][dimension.domain.gid] = dimension.gid;
        });
      }

      result[complexKey][datapoint.measure.gid] = datapoint.value;
      return result;
    }, {})
    .map((row) => {
      return _.map(pipe.select, column => row[column] || null);
    })
    .value();

  pipe.result = { header: pipe.select, rows: rows };
  return async.setImmediate(() => {
    return cb(null, pipe);
  });
}
