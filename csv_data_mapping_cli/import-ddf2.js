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

  let pipe = {
    raw: {},
    config,
    defaultEntityGroupTypes,
    defaultMeasureTypes,
    github: options.github || process.env.GITHUB_DDF_REPO,
    datasetName: options.datasetName || process.env.DDF_DATASET_NAME,
    commit: options.commit || process.env.DDF_REPO_COMMIT
  };

  async.waterfall([
    async.constant(pipe),
    common.resolvePathToDdfFolder,
    // resolvePathToTranslations,
    clearAllDbs,
    createUser,
    common.createTransaction,
    common.createDataset,
    common.updateTransaction,
    common.createConcepts,
    common.createEntities,
    common.createDataPoints,
    common.updateConceptsDimensions,
    // common.findLastDataset,
    // common.findLastVersion,
    // common.getAllConcepts,
    // common.createTranslations,
    // common.findDataPoints,
    // common.updateConceptsDimensions
    common.closeTransaction
  ], (err, pipe) => {
    console.timeEnd('done');
    return done(err, {datasetName: pipe.datasetName, version: pipe.transaction.createdAt});
  });
};

function clearAllDbs(pipe, cb) {
  if (process.env.CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT === 'true') {
    logger.info('clear all collections');

    let collectionsFn = _.map(ddfModels, model => {
      let modelName = _.chain(model).camelCase().upperFirst();
      return _cb => mongoose.model(modelName).remove({}, _cb);
    });

    return async.parallel(collectionsFn, (err) => cb(err, pipe));
  }

  return cb(null, pipe);
}

function createUser(pipe, done) {
  logger.info('create user');

  mongoose.model('Users').findOneAndUpdate({}, {
    name: 'Vasya Pupkin',
    email: 'email@email.com',
    username: 'VPup',
    password: 'VPup'
  }, {upsert: true, new: true})
  .lean()
  .exec((err, res) => {
    pipe.user = res;
    return done(err, pipe);
  });
}
