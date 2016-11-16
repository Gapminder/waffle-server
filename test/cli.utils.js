'use strict';

const _ = require('lodash');
const async = require('async');
const wsCli = require('waffle-server-import-cli');

const e2eEnv = require('./e2e.env');
const e2eUtils = require('./e2e.utils');
e2eUtils.setUpEnvironmentVariables();

require('../ws.config/db.config');
require('./../ws.repository');
const mongoose = require('mongoose');

const MODELS_TO_CLEAN = [
  'Concepts',
  'DataPoints',
  'Datasets',
  'DatasetTransactions',
  'Entities',
  'DatasetIndex'
];

const DEFAULT_WS_CLI_OPTIONS = {
  ws_port: e2eEnv.wsPort,
  pass: e2eEnv.pass,
  login: e2eEnv.login,
  repo: e2eEnv.repo
};

module.exports = {
  setDefaultCommit,
  cleanImportDataset,
  cleanImportAndSetDefaultCommit,
  runDatasetImport
};

function cleanImportAndSetDefaultCommit(commit, done) {
  cleanImportDataset(error => {
    if (error) {
      return done(error);
    }

    return setDefaultCommit(commit, done);
  });
}

function cleanImportDataset(done) {
  return cleanDatabase((error) => {
    if (error) {
      return done(error);
    }

    return runDatasetImport(done);
  });
}

function runDatasetImport(onIncrementalUpdateDone) {
  wsCli.importUpdate(DEFAULT_WS_CLI_OPTIONS, error => {
    if (error) {
      return onIncrementalUpdateDone(error);
    }
    return onIncrementalUpdateDone();
  });
}

function cleanDatabase(onDatabaseCleaned) {
  return async.forEachLimit(MODELS_TO_CLEAN, 10, (modelName, onCollectionDropped) => {
    return mongoose.model(modelName).collection.drop(error => {
      if (error && error.message != 'ns not found') {
        console.error(error);
        return onCollectionDropped(error);
      }

      console.log(`Collection ${modelName} was dropped`);

      return onCollectionDropped();
    });
  }, onDatabaseCleaned);
}

function setDefaultCommit(commit, options, done) {
  if (_.isFunction(options)) {
    done = options;
    options = {};
  }

  options = _.defaults(options, DEFAULT_WS_CLI_OPTIONS, {commit});
  wsCli.setDefault(options, error => {
    if (error) {
      return done(error);
    }
    console.log(`Default commit is set: ${commit}`);
    return done();
  });
}
