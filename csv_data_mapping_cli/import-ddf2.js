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

// take from args
let logger;
let config;
let ddfModels;
let pathToDdfFolder;
let resolvePath;
let ddfConceptsFile;
let fileTemplates;

module.exports = function (app, done) {
  logger = app.get('log');
  config = app.get('config');
  ddfModels = app.get('ddfModels');
  const common = require('./common')(app, done);

  pathToDdfFolder = config.PATH_TO_DDF_FOLDER;
  resolvePath = (filename) => path.resolve(pathToDdfFolder, filename);
  const ddfEnTranslations = require(resolvePath('../vizabi/en.json'));
  const ddfSeTranslations = require(resolvePath('../vizabi/se.json'));
  fileTemplates = {
    getFilenameOfEntityDomainEntities: _.template('ddf--entities--${ gid }.csv'),
    getFilenameOfEntitySetEntities: _.template('ddf--entities--${ domain.gid }--${ gid }.csv'),
    getFilenameOfConcepts: _.template(resolvePath('ddf--concepts.csv'))
  };

  let pipe = {
    ddfConceptsFile,
    raw: {},
    defaultEntityGroupTypes,
    defaultMeasureTypes,
    pathToDdfFolder,
    ddfEnTranslations,
    ddfSeTranslations
  };

  async.waterfall([
    async.constant(pipe),
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
    common.createTranslations,
    // common.findDataPoints,
    // common.updateConceptsDimensions
  ], (err, pipe) => {
    console.timeEnd('done');
    return done(err);
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

  return cb(null, _data);
}

function createUser(pipe, done) {
  logger.info('create user');

  mongoose.model('Users').create({
    name: 'Vasya Pupkin',
    email: 'email@email.com',
    username: 'VPup',
    password: 'VPup'
  }, (err, res) => {
    pipe.user = res.toObject();
    return done(err, pipe);
  });
}
