'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const mongoose = require('mongoose');

const common = require('./common');
const logger = require('../ws.config/log');
const config = require('../ws.config/config');
const constants = require('../ws.utils/constants');
const ddfImportProcess = require('../ws.utils/ddf-import-process');
const processConceptChanges = require('./ddf/import/incremental/import-concepts')();

const LIMIT_NUMBER_PROCESS = 10;

module.exports = function (options, done) {

  const mapFilenameToCollectionName = {
    concepts: 'Concepts',
    datapoints: 'DataPoints',
    entities: 'Entities'
  };
  const RESOLVED_PATH_TO_DIFF_DDF_RESULT_FILE = process.env.PATH_TO_DIFF_DDF_RESULT_FILE ? path.resolve(process.env.PATH_TO_DIFF_DDF_RESULT_FILE) : '';
  let diffFile = options.diff || require(RESOLVED_PATH_TO_DIFF_DDF_RESULT_FILE);
  let changedFiles = diffFile.files;
  let allChanges = diffFile.changes;
  let pipe = {
    changedFiles,
    allChanges,
    mapFilenameToCollectionName,
    common,
    commit: options.commit || process.env.DDF_REPO_COMMIT,
    datasetName: options.datasetName || process.env.DDF_DATASET_NAME,
    config,
    lifecycleHooks: options.lifecycleHooks,
    user: options.user
  };

  console.time('done');
  async.waterfall([
    async.constant(pipe),
    common.resolvePathToDdfFolder,
    // TODO: check last Transaction was closed ({isClosed: true})
    common.createTransaction,
    ddfImportProcess.activateLifecycleHook('onTransactionCreated'),
    common.findDataset,
    common.updateTransaction,
    getPreviousTransaction,
    addTransactionToDatasetVersions,
    processConceptChanges,
    getAllConcepts,
    getAllPreviousConcepts,
    processEntitiesChanges,
    processDataPointsChanges,
    common.closeTransaction
  ], (updateError, pipe) => {
    console.timeEnd('done');

    if (updateError && pipe.transaction) {
      return done(updateError, {transactionId: pipe.transaction._id});
    }


    return done(updateError, {datasetName: pipe.dataset.name, version: pipe.transaction.createdAt, transactionId: pipe.transaction._id});
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
    to: constants.MAX_VERSION
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: constants.MAX_VERSION
        }
      },
      subsetOf: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: constants.MAX_VERSION
        }
      },
      dimensions: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: constants.MAX_VERSION
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

function getAllPreviousConcepts(pipe, done) {
  logger.info('** get all concepts');

  mongoose.model('Concepts').find({
    dataset: pipe.dataset._id,
    from: { $lt: pipe.transaction.createdAt },
    to: pipe.transaction.createdAt
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lt: pipe.transaction.createdAt },
          to: pipe.transaction.createdAt
        }
      },
      subsetOf: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lt: pipe.transaction.createdAt },
          to: pipe.transaction.createdAt
        }
      },
      dimensions: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lt: pipe.transaction.createdAt },
          to: pipe.transaction.createdAt
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      pipe.previousConcepts = _.keyBy(res, 'gid');
      return done(err, pipe);
    });
}

function processEntitiesChanges(pipe, done) {
  logger.info('process entities changes');

  pipe.entitiesFiles = _.pickBy(pipe.allChanges, (ch, filename) => filename.match(/ddf--entities--/g));

  return async.forEachOfSeries(
    pipe.entitiesFiles,
    _processEntititesFile(pipe),
    err => {
      return done(err, pipe);
    }
  );
}

function _processEntititesFile(pipe) {
  let key = 1;

  return (fileChanges, filename, cb) => {
    let _pipe = {
      filename: filename,
      fileChanges: fileChanges.body,
      removedColumns: fileChanges.header.remove,
      previousConcepts: pipe.previousConcepts,
      concepts: pipe.concepts,
      transaction: pipe.transaction,
      dataset: pipe.dataset,
      common: pipe.common
    };

    return async.waterfall([
      async.constant(_pipe),
      __parseEntityFilename,
      __closeRemovedAndUpdatedEntities,
      __createAndUpdateEntities
    ], err => {
      logger.info(`** Processed ${key++} of ${_.keys(pipe.entitiesFiles).length} files`);

      return cb(err);
    });
  }
}

function __parseEntityFilename(pipe, cb) {
  logger.info(`**** load original entities from file ${pipe.filename}`);

  let parsedFilename = pipe.filename
    .replace('ddf--entities--', '')
    .replace('.csv', '')
    .split('--');

  let entityDomainGid = _.first(parsedFilename);
  let entitySetGid = _.last(parsedFilename);

  pipe.entitySet = pipe.previousConcepts[entitySetGid] || pipe.concepts[entitySetGid];
  pipe.entityDomain = pipe.previousConcepts[entityDomainGid] || pipe.concepts[entityDomainGid];

  return async.setImmediate(() => cb(null, pipe));
}

function __closeRemovedAndUpdatedEntities(pipe, cb) {
  logger.info(`** close entities`);

  if (pipe.removedColumns.length) {
    // EXPLANATION: just because if column was removed it should affect ALL Entities in file
    // so, we should close all of them before create their new version
    return ___processChangedColumnsBySource(pipe, cb);
  }

  return async.parallel([
    ___updateRemovedEntities(pipe.fileChanges.remove, pipe),
    ___updateRemovedEntities(pipe.fileChanges.update, pipe),
    ___updateRemovedEntities(pipe.fileChanges.change, pipe)
  ], (err) => {
    return cb(err, pipe);
  });
}

function ___processChangedColumnsBySource(pipe, cb) {
  let _pipe = {
    source: pipe.filename,
    entityDomain: pipe.entityDomain,
    entitySet: pipe.entitySet,
    transaction: pipe.transaction,
    dataset: pipe.dataset
  };

  return async.waterfall([
    async.constant(_pipe),
    ___closeAllEntitiesBySource,
    ___getAllEntitiesBySource
  ], (err, res) => {
    pipe.closedEntities = _.keyBy(res, 'gid');

    return cb(err, pipe);
  });
}

function ___closeAllEntitiesBySource(pipe, cb) {
  let query = {
    dataset: pipe.dataset._id,
    from: {$lte: pipe.transaction.createdAt},
    to: constants.MAX_VERSION,
    domain: pipe.entityDomain.originId,
    sets : pipe.entitySet ? pipe.entitySet.originId : {$size: 0}
  };

  return mongoose.model('Entities').update(
    query,
    {$set: {to: pipe.transaction.createdAt}},
    {multi: true},
    (err) => {
      return cb(err, pipe);
    });
}

function ___getAllEntitiesBySource(pipe, cb) {
  let query = {
    dataset: pipe.dataset._id,
    from: {$lte: pipe.transaction.createdAt},
    to: pipe.transaction.createdAt,
    domain: pipe.entityDomain.originId,
    sets : pipe.entitySet ? pipe.entitySet.originId : {$size: 0}
  };

  return mongoose.model('Entities').find(query)
    .lean()
    .exec((err, docs) => {
      return cb(err, docs);
    });
}

function ___updateRemovedEntities(removedEntities, pipe) {
  pipe.closedEntities = {};
  return (cb) => {
    return async.eachLimit(
      removedEntities,
      LIMIT_NUMBER_PROCESS,
      ____closeEntity(pipe),
      (err) => {
        return cb(err);
      });
  };
}

function ____closeEntity(pipe) {
  return (entity, ecb) => {
    let properties = {};
    properties[`properties.${entity.gid}`] = entity[entity.gid];

    let query = _.assign({
      dataset: pipe.dataset._id,
      from: {$lte: pipe.transaction.createdAt},
      to: constants.MAX_VERSION,
      domain: pipe.entityDomain.originId,
      sets : pipe.entitySet ? pipe.entitySet.originId : {$size: 0}
    }, properties);

    return mongoose.model('Entities').findOneAndUpdate(query, {$set: {to: pipe.transaction.createdAt}}, {new: true})
      .lean()
      .exec((err, doc) => {
        if (doc) {
          pipe.closedEntities[doc.gid] = doc;
        }

        return ecb(err, pipe);
      });
  };
}

function __createAndUpdateEntities(pipe, cb) {
  let _pipe = {
    filename: pipe.filename,
    entitySet: pipe.entitySet,
    entityDomain: pipe.entityDomain,
    fileChanges: pipe.fileChanges,
    removedColumns: pipe.removedColumns,
    closedEntities: pipe.closedEntities,
    concepts: pipe.concepts,
    transaction: pipe.transaction,
    dataset: pipe.dataset,
    common: pipe.common
  };

  return async.waterfall([
    async.constant(_pipe),
    ___fakeLoadRawOriginalEntities,
    pipe.common.createOriginalEntities,
    pipe.common.findAllOriginalEntities,
    pipe.common.createEntitiesBasedOnOriginalEntities,
    pipe.common.clearOriginalEntities,
    __getAllEntities,
    pipe.common.addEntityDrillups,
    __getAllEntities
  ], cb);
}

function ___fakeLoadRawOriginalEntities(pipe, done) {
  let removedEntitiesGids = _.chain(pipe.fileChanges.remove)
    .keyBy(getGid)
    .keys()
    .value();
  let closedEntities = _.mapValues(pipe.closedEntities, 'properties');
  let _changedClosedEntities = _.omit(closedEntities, removedEntitiesGids);
  let changedClosedEntities = _.mapValues(_changedClosedEntities, (entity) => _.omit(entity, pipe.removedColumns));

  let _mergedChangedEntities = mergeUpdatedAndChangedEntities(pipe.fileChanges.update, pipe.fileChanges.change);
  let mergedChangedEntities = _.merge(changedClosedEntities, _mergedChangedEntities);

  let updatedEntities = _.map(mergedChangedEntities, ____formRawEntities(pipe));
  let createdEntities = _.map(pipe.fileChanges.create, pipe.common.mapDdfOriginalEntityToWsModel(pipe));

  let fakeLoadedEntities = _.concat([], createdEntities, updatedEntities);
  let uniqEntities = _.uniqBy(fakeLoadedEntities, 'gid');

  if (uniqEntities.length !== fakeLoadedEntities.length) {
    return async.setImmediate(() => done('All entity gid\'s should be unique within the Entity Set or Entity Domain!'));
  }

  pipe.raw ={
    originalEntities: fakeLoadedEntities
  };

  return async.setImmediate(() => done(null, pipe));

  function getGid(conceptChange) {
    return conceptChange[conceptChange.gid];
  }

  function mergeUpdatedAndChangedEntities(updatedEntities, changedEntities) {
    return _.mapValues(_.groupBy(_.concat(updatedEntities, changedEntities), getGid), values => {
      return _.merge.apply(null, _.flatMap(values, value => value['data-update']));
    });
  }
}

function ____formRawEntities(pipe) {
  let mapper = pipe.common.mapDdfOriginalEntityToWsModel(pipe);
  return (entity, entityGid) => {
    let closedEntity = pipe.closedEntities[entityGid];
    let originId = closedEntity ? closedEntity.originId : null;
    let result = _.assign(entity, {originId});

    return mapper(result);
  }
}

function processDataPointsChanges(pipe, done) {
  logger.info('process data points changes');
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
    __getAllPreviousEntities,
    __closeRemovedAndUpdatedDataPoints,
    __fakeLoadRawDataPoints,
    __wrapProcessRawDataPoints,
    pipe.common.createEntitiesBasedOnDataPoints,
    __getAllEntities,
    pipe.common._createDataPoints,
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
    to: constants.MAX_VERSION,
    'properties.language': { $not: { $in: ['en', 'se'] } }
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: constants.MAX_VERSION
        }
      },
      sets: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: constants.MAX_VERSION
        }
      },
      drillups: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lte: pipe.transaction.createdAt },
          to: constants.MAX_VERSION
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

function __getAllPreviousEntities(pipe, done) {
  logger.info('** get all entities');

  mongoose.model('Entities').find({
    dataset: pipe.dataset._id,
    from: { $lt: pipe.transaction.createdAt },
    to: pipe.transaction.createdAt,
    'properties.language': { $not: { $in: ['en', 'se'] } }
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lt: pipe.transaction.createdAt },
          to: pipe.transaction.createdAt
        }
      },
      sets: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lt: pipe.transaction.createdAt },
          to: pipe.transaction.createdAt
        }
      },
      drillups: {
        $find: {
          dataset: pipe.dataset._id,
          from: { $lt: pipe.transaction.createdAt },
          to: pipe.transaction.createdAt
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      pipe.previousEntities = res;
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
  let groupedPreviousEntities = _.groupBy(pipe.previousEntities, 'gid');
  let groupedEntities = _.groupBy(pipe.entities, 'gid');

  return (datapoint, ecb) => {
    let entityGids = _.chain(datapoint)
      .pick(_.keys(pipe.dimensions))
      .values()
      .compact()
      .value();

    let entities = _.flatMap(entityGids, (gid) => {
      return groupedEntities[gid] || groupedPreviousEntities[gid];
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
      from: {$lt: pipe.transaction.createdAt},
      to: constants.MAX_VERSION,
      measure: measure.originId,
      dimensions: {
        $size: _.size(pipe.dimensions),
        // TODO: get the point to presentation
        $not: {$elemMatch: {$nin : _.map(entities, 'originId') }}
      },
      value: datapoint[measure.gid]
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
  };
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
