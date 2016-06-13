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
    .exec((err, dataset) => {
      if (!dataset) {
        return done(`Given dataset "${pipe.datasetName}" doesn't exist`);
      }

      pipe.dataset = dataset;
      return done(err, pipe);
    });
}

function getVersion(pipe, done) {
  let query = {
    dataset: pipe.dataset._id
  };

  if (pipe.version) {
    query.createdAt = pipe.version;
  }

  mongoose.model('DatasetTransactions').find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((err, transactions) => {
      if (!transactions || _.isEmpty(transactions)) {
        return done(`Given dataset version "${pipe.version}" doesn't exist`);
      }

      pipe.transaction = _.first(transactions);
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
      pipe.conceptsByOriginId = _.keyBy(res, 'originId');

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
                return resolvedFilters[domainOriginId].indexOf(entity.gid) > -1;
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
        let domainOriginId = entitySet.domain ? entitySet.domain.originId : entitySet.originId
        return {$elemMatch: { $in: pipe.entitiesGroupedByDomain[domainOriginId]}}
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

function mapResult(pipe, cb) {
  // let measuresByOriginId = _.keyBy(pipe.measures, 'originId');
  let rows = _.chain(pipe.datapoints)
    .reduce((result, datapoint) => {
      let complexKey = _.chain(datapoint.dimensions)
        .map((dimension) => pipe.entities[dimension])
        .sortBy((originEntity) => {
          let domainGid = pipe.conceptsByOriginId[originEntity.domain].gid;
          return pipe.select.indexOf(domainGid);
        })
        .map('gid')
        .join(':')
        .value();

      if (!result[complexKey]) {
        result[complexKey] = {};
        _.each(datapoint.dimensions, (dimension) => {
          let originEntity = pipe.entities[dimension];
          let domainGid = pipe.conceptsByOriginId[originEntity.domain].gid;

          result[complexKey][domainGid] = originEntity.gid;
        });
      }
      let measureGid = pipe.conceptsByOriginId[datapoint.measure].gid;
      result[complexKey][measureGid] = datapoint.value;
      return result;
    }, {})
    .map((row) => {
      return _.map(pipe.select, column => (_.isNaN(_.toNumber(row[column])) ? row[column] : +row[column]) || null);
    })
    .value();

  return async.setImmediate(() => {
    return cb(null, {
      headers: pipe.select,
      rows: _.sortBy(rows, ['0', '1']) });
  });
}
