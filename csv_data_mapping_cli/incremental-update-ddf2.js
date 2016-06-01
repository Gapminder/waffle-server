'use strict';

console.time('done');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const mongoose = require('mongoose');

// geo mapping
const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time', 'age'];
const defaultMeasureTypes = ['measure'];
const DELETE_MARK = 'D';
const ADD_MARK = 'A';
const MODIFY_MARK = 'M';

const LIMIT_NUMBER_PROCESS = 10;
const MAX_VALUE = Number.MAX_SAFE_INTEGER;
const ddfModels = [
  'concepts',
  'data-points',
  'dataset-transactions',
  'datasets',
  'entities',
  'original-entities',
  'users'
];

// take from args
let logger;
let config;


module.exports = function (app, done, options) {
  logger = app.get('log');
  config = app.get('config');

  const common = require('./common')(app, done);

  const mapFilenameToCollectionName = {
    concepts: 'Concepts',
    datapoints: 'DataPoints',
    entities: 'Entities'
  };
  let diffFile = options.diff;//require(path.resolve(pathToDiffDdfFile));
  let changedFiles = diffFile.files;
  let allChanges = diffFile.changes;
  let pipe = {
    changedFiles,
    allChanges,
    mapFilenameToCollectionName,
    common,
    commit: options.commit,
    datasetName: options.datasetName,
    config
  };

  async.waterfall([
    async.constant(pipe),
    common.resolvePathToDdfFolder,
    findUser,
    // TODO: check 
    common.createTransaction,
    common.findDataset,
    common.updateTransaction,
    getPreviousTransaction,
    // TODO: update dataset.versions for using successful transaction
    addTransactionToDatasetVersions,
    // processConceptsChanges,
    // processEntitiesChanges,
    getAllConcepts,
    // TODO: process removed and modified files (FIRST OF ALL - CHECK)
    // TODO: close all unused entities which refer to removed DP
    // TODO: fix sources for datapoints, concepts and entities
    processDataPointsChanges,
    common.closeTransaction
  ], (err, pipe) => {
    console.timeEnd('done');
    return done(err, {datasetName: pipe.dataset.name, version: pipe.transaction.createdAt});
  });
};

function findUser(pipe, done) {
  logger.info('find user');

  mongoose.model('Users').findOne({})
    .lean()
    .exec((err, res) => {
      pipe.user = res;
      return done(err, pipe);
    });
}

function getPreviousTransaction(pipe, done) {
  logger.info('get previous transaction');

  mongoose.model('DatasetTransactions').findOne({
    createdAt: pipe.dataset.versions[pipe.dataset.versions.length - 1]
  })
    .lean()
    .exec((err, res) => {
      pipe.transactionId = res._id;
      return done(err, pipe);
    });
}

function addTransactionToDatasetVersions(pipe, done) {
  logger.info('get previous transaction');

  mongoose.model('Datasets').update({_id: pipe.dataset._id}, {
    $addToSet: {
      versions: pipe.transaction.createdAt
    }
  }, (err) => {
    return done(err, pipe);
  });
}

function getAllConcepts(pipe, done) {
  logger.info('** get all concepts');

  mongoose.model('Concepts').find({
    dataset: pipe.dataset._id,
    from: { $lte: pipe.transaction.createdAt },
    to: { $gt: pipe.transaction.createdAt }
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: { $gt: pipe.transaction.createdAt }
        }
      },
      subsetOf: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: { $gt: pipe.transaction.createdAt }
        }
      },
      dimensions: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: { $gt: pipe.transaction.createdAt }
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      pipe.concepts = _.keyBy(res, 'gid');
      return done(err, pipe);
    });
}

function processDataPointsChanges(pipe, done) {
  pipe.datapointsFiles = _.omitBy(pipe.allChanges, (ch, filename) => !filename.match(/ddf--datapoints--/g));

  return async.forEachOfSeries(
    pipe.datapointsFiles,
    _processDataPointFile(pipe),
    err => done(err, pipe)
  );
}

function _processDataPointFile(pipe) {
  let key = 1;
  return (fileChanges, filename, cb) => async.waterfall([
    async.constant({
      filename: filename,
      fileChanges: fileChanges.body,
      concepts: pipe.concepts,
      transaction: pipe.transaction,
      dataset: pipe.dataset,
      common: pipe.common
    }),
    pipe.common.parseFilename,
    __getAllEntities,
    __closeRemovedAndUpdatedDataPoints,
    __fakeLoadRawDataPoints,
    __wrapProcessRawDataPoints,
    pipe.common.createEntitiesBasedOnDataPoints,
    __getAllEntities,
    pipe.common._createDataPoints, // обнови в common использование originID
  ], err => {
    logger.info(`** Processed ${key++} of ${_.keys(pipe.datapointsFiles).length} files`);

    return cb(err);
  });
}

function __getAllEntities(pipe, done) {
  logger.info('** get all entities');

  mongoose.model('Entities').find({
    dataset: pipe.dataset._id,
    from: { $lte: pipe.transaction.createdAt },
    to: MAX_VALUE,
    'properties.language': { $not: { $in: ['en', 'se'] } }
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: MAX_VALUE,
        }
      },
      sets: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: MAX_VALUE,
        }
      },
      drillups: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: MAX_VALUE,
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      pipe.entities = res;
      return done(err, pipe);
    });
}

function __closeRemovedAndUpdatedDataPoints(pipe, done) {
  logger.info(`** close data points`);

  pipe.closedDataPoints = {};

  return async.parallel([
    ___updateRemovedDataPoints(pipe.fileChanges.remove, pipe),
    ___updateChangedDataPoints(pipe.fileChanges.update, pipe),
    ___updateChangedDataPoints(pipe.fileChanges.change, pipe)
  ], (err) => {
    return done(err, pipe);
  });
}

function ___updateRemovedDataPoints(removedDataPoints, pipe) {
  return (cb) => {
    return async.eachLimit(
      removedDataPoints,
      LIMIT_NUMBER_PROCESS,
      ____closeDataPoint(pipe),
      (err) => {
        return cb(err);
    });
  };
}

function ____closeDataPoint(pipe) {
  let groupedEntities = _.groupBy(pipe.entities, 'gid');

  return (datapoint, ecb) => {
    let entityGids = _.chain(datapoint)
      .pick(_.keys(pipe.dimensions))
      .values()
      .compact()
      .value();
    // TODO: try to get not first element, but the element which belongs to related domain or sets
    let entities = _.map(entityGids, (gid) => {
      return _.first(groupedEntities[gid]).originId;
    });

    return async.eachLimit(
      pipe.measures,
      LIMIT_NUMBER_PROCESS,
      _____updateDataPoint(pipe, entities, datapoint),
      (err) => {
        return ecb(err);
      }
    );
  };
}

function _____updateDataPoint(pipe, entities, datapoint) {
  return (measure, ecb) => {
    return mongoose.model('DataPoints').findOneAndUpdate({
      dataset: pipe.dataset._id,
      from: {$lte: pipe.transaction.createdAt},
      to: MAX_VALUE,
      value: datapoint[measure.gid],
      measure: measure.originId,
      dimensions: {
        $size: entities.length,
        $all: entities
      }
    }, {$set: {to: pipe.transaction.createdAt}}, {new: true})
      .lean()
      .exec((err, doc) => {
        if (doc) {
          let complexKey = getComplexKey(datapoint);

          pipe.closedDataPoints[complexKey] = doc;
        }

        return ecb(err, pipe);
      });
  };
}

function ___updateChangedDataPoints(changedDataPoints, pipe) {
  return (cb) => {
    return async.mapLimit(
      _.map(changedDataPoints, 'data-origin'),
      LIMIT_NUMBER_PROCESS,
      ____closeDataPoint(pipe),
      cb
    );
  };
}

function __fakeLoadRawDataPoints(pipe, done) {
  let updatedDataPoints = _.map(pipe.fileChanges.update, ___formRawDataPoint(pipe));
  let changedDataPoints = _.map(pipe.fileChanges.change, ___formRawDataPoint(pipe));
  let fakeLoadedDatapoints = _.concat(pipe.fileChanges.create, updatedDataPoints, changedDataPoints);

  pipe.fakeLoadedDatapoints = fakeLoadedDatapoints;

  return async.setImmediate(() => done(null, pipe));
}

function ___formRawDataPoint(pipe) {
  return (datapoint) => {
    let complexKey = getComplexKey(datapoint['data-origin']);
    let closedOriginDatapoint = pipe.closedDataPoints[complexKey];
    let originId = closedOriginDatapoint ? closedOriginDatapoint.originId : null;
    return _.defaults({originId}, datapoint['data-update'], datapoint['data-origin'])
  }
}

function __wrapProcessRawDataPoints(pipe, done) {
  return pipe.common.processRawDataPoints(pipe, done)(null, pipe.fakeLoadedDatapoints);
}

// UTILS FUNCTIONS
function getComplexKey(obj) {
  return _.chain(obj)
    .keys()
    .sort()
    .map(key => `${key}:${obj[key]}`)
    .join('--')
    .value();
}
