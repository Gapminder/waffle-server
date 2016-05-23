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

// take from args
let logger;
let config;
let ddfModels;
let resolvePath;

module.exports = function (app, done) {
  logger = app.get('log');
  config = app.get('config');
  ddfModels = app.get('ddfModels');
  const common = require('./common')(app, done);

  const mapFilenameToCollectionName = {
    concepts: 'Concepts',
    datapoints: 'DataPoints',
    entities: 'Entities'
  };
  const pathToDiffDdfFile = config.PATH_TO_DIFF_DDF_RESULT_FILE;
  let diffFile = require(path.resolve(pathToDiffDdfFile));
  let changedFiles = diffFile.files;
  let allChanges = diffFile.changes;

  async.waterfall([
    async.constant({changedFiles, allChanges, mapFilenameToCollectionName, common}),
    findUser,
    common.createTransaction,
    common.findDataset,
    common.updateTransaction,
    getPreviousTransaction,
    // processConceptsChanges,
    // processEntitiesChanges,
    common.getAllConcepts,
    processDataPointsChanges
    // common.createConcepts,
    // common.createEntities,
    // common.createDataPoints,
    // common.findLastVersion,
    // common.getAllConcepts,
    // common.createTranslations,
    // common.findDataPoints,
    // common.updateConceptsDimensions
  ], (err, pipe) => {
    console.timeEnd('done');
    return done(err);
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

function processDataPointsChanges(pipe, done) {
  pipe.datapointsFiles = _.omitBy(pipe.allChanges, (ch, filename) => !filename.match(/ddf--datapoints--/g));

  return async.forEachOfSeries(
    pipe.datapointsFiles,
    processDataPointFile(pipe),
    err => done(err, pipe)
  );
}

function processDataPointFile(pipe) {
  let key = 1;
  return (fileChanges, filename, cb) => async.waterfall([
    async.constant({
      filename: filename,
      fileChanges: fileChanges.body,
      concepts: pipe.concepts,
      transaction: pipe.transaction,
      transactionId: pipe.transactionId,
      dataset: pipe.dataset
    }),
    pipe.common.parseFilename,
    pipe.common.findAllEntities,
    closeRemovedAndUpdatedDataPoints, // передать все закрытые DP в pipe
    fakeLoadRawDataPoints, // не забудь про originId
    pipe.common.processRawDataPoints,
    addRawEntitiesFromUpdatedDataPoints,
    pipe.common.createEntitiesBasedOnDataPoints,
    pipe.common.findAllEntities,
    pipe.common.createDataPoints, // обнови в common использование originID
    pipe.common.updateConceptsDimensions
  ], err => {
    logger.info(`** Processed ${key++} of ${_.keys(pipe.datapointsFiles).length} files`);

    return cb(err);
  });
}

function closeRemovedAndUpdatedDataPoints(pipe, done) {
  logger.info(`** close data points`);
  let entitiesGroupedByGid = _.groupBy(pipe.entities, 'gid');

  return async.parallel([
    updateRemovedDataPoints(pipe.fileChanges.remove, entitiesGroupedByGid, pipe.dimensions),
    updateUpdatedDataPoints(pipe.fileChanges.update, entitiesGroupedByGid, pipe.dimensions),
    updateChangedDataPoints(pipe.fileChanges.change, entitiesGroupedByGid, pipe.dimensions)
  ], (err) => {
    return done(err, pipe);
  });

  function updateRemovedDataPoints(removedDataPoints, entities, dimensions) {
    return (cb) => {
      return async.each(removedDataPoints, (datapoint, ecb) => {
        let dataPointEntities = _.chain(datapoint)
          .pick(_.keys(dimensions))
          .reduce((result, entityGid, conceptGid) => {
            let matchedEntity = _.find(entities[entityGid], (entity) => {
              return entity.domain.gid === conceptGid || _.some(entity.sets, ['gid', conceptGid]);
            });

            if (matchedEntity.originId) {
              result.push(matchedEntity.originId);
            }

            return result;
          }, [])
          .value();

        logger.info('get previous transaction');

        mongoose.model('DataPoints').update({
          dataset: pipe.dataset._id,
          from: {$lt: pipe.transaction.createdAt},
          to: Number.MAX_VALUE,
          dimensions: {
            $size: dataPointEntities.length,
            $all: dataPointEntities
          }
        }, {$set: {to: pipe.transaction.createdAt}})
          .lean()
          .exec((err, res) => {
            return ecb();
          });
      }, cb);
    };
  }

  function updateUpdatedDataPoints(updatedDataPoints, entities, dimensions) {
    return (cb) => cb();
  }

  function updateChangedDataPoints(changedDataPoints, entities, dimensions) {
    return (cb) => cb();
  }
}

function fakeLoadRawDataPoints() {

}

function addRawEntitiesFromUpdatedDataPoints() {

}
