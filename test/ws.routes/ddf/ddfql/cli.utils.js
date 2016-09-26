'use strict';

const _ = require('lodash');
const fs = require('fs');
const git = require('simple-git');
const path = require('path');
const shell = require('shelljs');
const async = require('async');

const logger = require('../../../../ws.config/log');

require('../../../../ws.config/db.config');
require('./../../../../ws.repository/index.js');
const mongoose = require('mongoose');

const MODELS_TO_CLEAN = [
  'concepts',
  'datapoints',
  'datasets',
  'datasettransactions',
  'entities',
  'translations',
  'datasetindexes'
];

const WS_CLI_DIR = path.resolve(__dirname, '../../../../../waffle-server-import-cli');

const DEFAULT_WS_CLI_OPTIONS = {
  password: '123',
  login: 'dev@gapminder.org',
  datasetRepository: 'git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git'
};

module.exports = {
  setDefaultCommit,
  cleanImportDataset,
  cleanImportAndSetDefaultCommit
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

    return cloneWsCliRepository(done);
  });
}

function cloneWsCliRepository(onCLIRepositoryCloned) {
  return fs.stat(WS_CLI_DIR, (error, stats) => {
    if (error) {
      return onCLIRepositoryCloned(error);
    }

    if (stats.isDirectory()) {
      runDatasetImport(onCLIRepositoryCloned);
    } else {
      const repoUrl = 'http://github.com/Gapminder/waffle-server-import-cli.git';
      return git().clone(repoUrl, WS_CLI_DIR, installNpmModules(onCLIRepositoryCloned));
    }
  });
}

function installNpmModules(onModulesInstalled) {
  return (error) => {
    if (error) {
      return onModulesInstalled(error);
    }

    return shell.exec(`npm  --prefix ${WS_CLI_DIR} install`, (error) => {
      if (error) {
        return onModulesInstalled(error);
      }

      return runDatasetImport(WS_CLI_DIR, onModulesInstalled);
    });
  };
}

function runDatasetImport(onIncrementalUpdateDone) {
  const command = `REPO=${DEFAULT_WS_CLI_OPTIONS.datasetRepository} LOGIN=${DEFAULT_WS_CLI_OPTIONS.login} PASS=${DEFAULT_WS_CLI_OPTIONS.password} npm --prefix ${WS_CLI_DIR} run import`;
  return shell.exec(command, (error) => {
    logger.log('Incremental update is completed');
    return onIncrementalUpdateDone(error);
  });
}

function cleanDatabase(onDatabaseCleaned) {
  return async.forEachLimit(MODELS_TO_CLEAN, 10, (modelName, onCollectionDropped) => {
    return mongoose.connection.collections[modelName].drop(error => {
      if (error && error.message != 'ns not found') {
        logger.error(error);
        return onCollectionDropped(error);
      }

      logger.log(`Collection ${modelName} was dropped`);

      return onCollectionDropped();
    });
  }, onDatabaseCleaned);
}

function setDefaultCommit(commit, options, done) {
  if (_.isFunction(options)) {
    done = options;
  }

  options = _.defaults(DEFAULT_WS_CLI_OPTIONS);

  const setDefaultCommitCommand = `REPO=${options.datasetRepository} COMMIT=${commit} LOGIN=${options.login} PASS=${options.password} npm --prefix ${WS_CLI_DIR} run set-default`;
  return shell.exec(setDefaultCommitCommand, error => {
    logger.log(`Default commit is set: ${commit}`);
    return done(error);
  });
}
