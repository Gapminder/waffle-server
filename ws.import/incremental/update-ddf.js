'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const common = require('./../common');
const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const ddfImportUtils = require('../import-ddf.utils');

const createDatasetIndex = require('./../import-dataset-index.service');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const updateConcepts = require('./update-concepts');
const updateDatapoints = require('./update-datapoints');
const updateTranslations = require('./update-translations');

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
    commit: options.commit,
    datasetName: options.datasetName,
    config,
    lifecycleHooks: options.lifecycleHooks,
    user: options.user
  };

  console.time('done');
  async.waterfall([
    async.constant(pipe),
    common.resolvePathToDdfFolder,
    common.createTransaction,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    common.findDataset,
    common.establishTransactionForDataset,
    updateConcepts,
    getAllConcepts,
    getAllPreviousConcepts,
    processEntitiesChanges,
    updateDatapoints,
    // updateTranslations,
    createDatasetIndex,
    common.closeTransaction
  ], (updateError, pipe) => {
    console.timeEnd('done');

    if (updateError && pipe.transaction) {
      return done(updateError, {transactionId: pipe.transaction._id});
    }

    return done(updateError, {
      datasetName: pipe.dataset.name,
      version: pipe.transaction.createdAt,
      transactionId: pipe.transaction._id
    });
  });
};

function getAllConcepts(pipe, done) {
  return conceptsRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.concepts = _.keyBy(res, 'gid');
      return done(err, pipe);
    });
}

function getAllPreviousConcepts(pipe, done) {
  return conceptsRepositoryFactory.previousVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
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
      dataset: pipe.dataset
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
  };
}

function __parseEntityFilename(pipe, cb) {
  logger.info(`**** load entities from file ${pipe.filename}`);

  let parsedFilename = pipe.filename
    .replace('ddf--entities--', '')
    .replace('.csv', '')
    .split('--');

  let entityDomainGid = _.first(parsedFilename);
  let entitySetGid = _.last(parsedFilename);

  pipe.entitySet = pipe.concepts[entitySetGid] || pipe.previousConcepts[entitySetGid];
  pipe.entityDomain = pipe.concepts[entityDomainGid] || pipe.previousConcepts[entityDomainGid];

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
    ___updateRemovedEntities(pipe.fileChanges.change, pipe),
    ___updateRemovedEntities(pipe.fileChanges.translate, pipe)
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
  const query = {
    domain: pipe.entityDomain.originId,
    sets: getQuerySetsClause(pipe.entityDomain, pipe.entitySet)
  };

  return entitiesRepositoryFactory
    .latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .closeByDomainAndSets(query, err => cb(err, pipe));
}

function ___getAllEntitiesBySource(pipe, cb) {
  const query = {
    domain: pipe.entityDomain.originId,
    sets: getQuerySetsClause(pipe.entityDomain, pipe.entitySet)
  };

  return entitiesRepositoryFactory
    .previousVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findByDomainAndSets(query, (err, docs) => {
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
  const entitiesRepository = entitiesRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt);

  return (entity, ecb) => {
    const query = _.assign({
      domain: pipe.entityDomain.originId,
      sets: getQuerySetsClause(pipe.entityDomain, pipe.entitySet)
    }, {[`properties.${entity.gid}`]: entity[entity.gid]});

    return entitiesRepository.closeOneByQuery(query, (err, doc) => {
      if (err) {
        return ecb(err);
      }

      if (doc) {
        pipe.closedEntities[doc.gid] = doc;
      }

      return ecb(null, pipe);
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
  };

  return async.waterfall([
    async.constant(_pipe),
    ___fakeLoadRawEntities,
    common.storeEntitiesToDb,
    __getAllEntities,
    common.addEntityDrillups,
    __getAllEntities
  ], cb);
}

function ___fakeLoadRawEntities(pipe, done) {
  let removedEntitiesGids = _.chain(pipe.fileChanges.remove)
    .keyBy(getGid)
    .keys()
    .value();
  let closedEntities = _.mapValues(pipe.closedEntities, 'properties');
  let _changedClosedEntities = _.omit(closedEntities, removedEntitiesGids);
  let changedClosedEntities = _.mapValues(_changedClosedEntities, (entity) => _.omit(entity, pipe.removedColumns));

  let _mergedChangedEntities = mergeUpdatedAndChangedEntities(pipe.fileChanges.update, pipe.fileChanges.change, pipe.fileChanges.translate);
  let mergedChangedEntities = _.merge(changedClosedEntities, _mergedChangedEntities);

  let updatedEntities = _.map(mergedChangedEntities, ____formRawEntities(pipe));
  let createdEntities = _.map(pipe.fileChanges.create, common.mapDdfEntityToWsModel(pipe));

  let fakeLoadedEntities = _.concat([], createdEntities, updatedEntities);
  let uniqEntities = _.uniqBy(fakeLoadedEntities, 'gid');

  if (uniqEntities.length !== fakeLoadedEntities.length) {
    return async.setImmediate(() => done('All entity gid\'s should be unique within the Entity Set or Entity Domain!'));
  }

  pipe.entities = fakeLoadedEntities;

  return async.setImmediate(() => done(null, pipe));

  function getGid(conceptChange) {
    return conceptChange[conceptChange.gid];
  }

  function mergeUpdatedAndChangedEntities(updatedEntities, changedEntities) {
    return _.mapValues(_.groupBy(_.concat(updatedEntities, changedEntities), getGid), values => {
      return _.merge.apply(null, _.flatMap(values, value => _.extend(_.omit(value, 'data-update', 'gid'), value['data-update'])));
    });
  }
}

function ____formRawEntities(pipe) {
  let mapper = common.mapDdfEntityToWsModel(pipe);
  return (properties, entityGid) => {
    const closedEntity = pipe.closedEntities[entityGid];
    const originId = closedEntity ? closedEntity.originId : null;
    const languages = closedEntity.languages || null;
    const context = {originId, languages};

    return mapper(properties, context);
  };
}

function __getAllEntities(pipe, done) {
  logger.info('** get all entities');
  return entitiesRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.entities = res;
      return done(err, pipe);
    });
}

function getQuerySetsClause(entityDomain, entitySet) {
  return entitySet && entityDomain.originId !== entitySet.originId ? entitySet.originId : {$size: 0};
}
