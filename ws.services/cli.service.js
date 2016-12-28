'use strict';

const _ = require('lodash');
const git = require('simple-git');
const async = require('async');
const crypto = require('crypto');

const cache = require('../ws.utils/redis-cache');
const config = require('../ws.config/config');
const constants = require('../ws.utils/constants');
const authService = require('./auth.service');
const reposService = require('./repos.service');
const securityUtils = require('../ws.utils/security');
const ddfImportUtils = require('../ws.import/utils/import-ddf.utils');
const datasetsService = require('./datasets.service');
const usersRepository = require('../ws.repository/ddf/users/users.repository');
const importDdfService = require('../ws.import/import-ddf');
const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');
const transactionsService = require('./dataset-transactions.service');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const incrementalUpdateService = require('../ws.import/incremental/update-ddf');

module.exports = {
  getGitCommitsList,
  importDataset,
  updateIncrementally,
  getAvailableDatasetsAndVersions,
  getCommitOfLatestDatasetVersion,
  authenticate,
  findDatasetsWithVersions,
  setTransactionAsDefault,
  cleanDdfRedisCache,
  setAccessTokenForDataset
};

function getGitCommitsList(github, onCommitsRecieved) {
  if (!github) {
    return cb('Url to dataset\'s github repository was not provided');
  }

  return async.waterfall([
    async.constant({github}),
    ddfImportUtils.cloneDdfRepo,
    _getPathToRepo
  ], onCommitsRecieved);
}

function _getPathToRepo(pipe, done) {
  return git(pipe.repoInfo.pathToRepo)
    .log((err, log) => {
      return done(err, {commits: _.reverse(log.all)});
    });
}

function _findCurrentUser(pipe, done) {
  usersRepository.findUserByEmail(constants.DEFAULT_USER_EMAIL, (error, user) => {
    if (error || !user) {
      return done(error || 'User that tries to initiate import was not found');
    }
    pipe.user = user;
    return done(error, pipe);
  });
}

function importDataset(params, onDatasetImported) {
  return async.waterfall([
    async.constant(params),
    _findCurrentUser,
    _findDataset,
    _validateDatasetBeforeImport,
    _importDdfService,
    _unlockDataset
  ], (importError, pipe) => {
    if (importError && pipe && pipe.transactionId) {
      return transactionsService.setLastError(pipe.transactionId, _.toString(importError), () => onDatasetImported(importError));
    }
    return onDatasetImported(importError, pipe);
  });
}

function _findDataset(pipe, done) {
  return datasetsRepository.findByGithubUrl(pipe.github, (error, dataset) => {
    if (error) {
      return done(error);
    }

    pipe.dataset = dataset;
    return done(error, pipe);
  });
}

function _validateDatasetBeforeImport(pipe, done) {
  if (pipe.dataset) {
    return _handleAsynchronously('Dataset exists, cannot import same dataset twice', pipe, done);
  }

  return _handleAsynchronously(null, pipe, done);
}

function _importDdfService(pipe, onDatasetImported) {
  const options = {
    isDatasetPrivate: pipe.repoType === 'private',
    datasetName: reposService.getRepoNameForDataset(pipe.github),
    commit: pipe.commit,
    github: pipe.github,
    user: pipe.user,
    lifecycleHooks: pipe.lifecycleHooks
  };

  return importDdfService(options, onDatasetImported);
}

function _unlockDataset(pipe, done) {
  return datasetsRepository.unlock(pipe.datasetName, (err, dataset) => {
    if (!dataset) {
      return done(`Version of dataset "${pipe.datasetName}" wasn't locked`);
    }

    return done(err, pipe);
  });
}

function updateIncrementally(params, onDatasetUpdated) {
  return async.waterfall([
    async.constant(params),
    _findCurrentUser,
    _findDataset,
    securityUtils.validateDatasetOwner,
    _lockDataset,
    _checkTransaction,
    _runIncrementalUpdate,
    _unlockDataset
  ], (importError, pipe) => {
    if (importError) {
      if (pipe && pipe.transactionId) {
        return transactionsService.setLastError(pipe.transactionId, _.toString(importError), () => onDatasetUpdated(importError));
      }

      return _unlockDataset({datasetName: params.datasetName}, unlockError => onDatasetUpdated(importError));
    }

    return onDatasetUpdated(importError, pipe);
  });
}

function _lockDataset(pipe, done) {
  return datasetsRepository.lock(pipe.dataset.name, (err, dataset) => {
    if (err) {
      return done(err);
    }

    if (!dataset) {
      return done(`Version of dataset "${pipe.dataset.name}" was already locked or dataset is absent`);
    }

    return done(null, pipe);
  });
}

function _checkTransaction(pipe, done) {
  return transactionsRepository.findByDatasetAndCommit(pipe.dataset._id, pipe.commit, (error, transaction) => {
    if (transaction) {
      return done(`Version of dataset "${pipe.github}" with commit: "${transaction.commit}" was already applied`);
    }

    return done(error, pipe);
  });
}

function _runIncrementalUpdate(pipe, onDatasetUpdated) {
  const options = {
    datasetName: pipe.datasetName,
    commit: pipe.commit,
    github: pipe.github,
    lifecycleHooks: pipe.lifecycleHooks,
    user: pipe.user,
    hashFrom: pipe.hashFrom,
    hashTo: pipe.hashTo
  };

  return incrementalUpdateService(options, onDatasetUpdated);
}

function getAvailableDatasetsAndVersions(userId, onQueriesGot) {
  return datasetsService.findDatasetsWithVersions(userId, (error, datasetsWithVersions) => {
    return async.mapLimit(datasetsWithVersions, 3, (dataset, onDatasetsAndVersionsFound) => {
      return async.mapLimit(dataset.versions, 3, (version, cb) => {
        return cb(null, {
          createdAt: version.createdAt,
          datasetName: dataset.name,
          version: version.commit,
        });
      }, onDatasetsAndVersionsFound);
    }, (error, result) => {
      if (error) {
        return onQueriesGot(error);
      }
      return onQueriesGot(null, _.flattenDeep(result));
    });
  });
}

function getCommitOfLatestDatasetVersion(github, user, cb) {
  return async.waterfall([
    async.constant({github, user}),
    _findDataset,
    securityUtils.validateDatasetOwner,
    _validateDatasetBeforeIncrementalUpdate,
    _findTransaction
  ], cb);
}

function _validateDatasetBeforeIncrementalUpdate(pipe, done) {
  if (!pipe.dataset) {
    return _handleAsynchronously('Dataset was not found, hence hash commit of it\'s latest version cannot be acquired', pipe, done);
  }

  if (pipe.dataset.isLocked) {
    return _handleAsynchronously('Dataset was locked. Please, start rollback process.', pipe, done);
  }

  return _handleAsynchronously(null, pipe, done);
}

function _handleAsynchronously(error, result, done) {
  return async.setImmediate(() => {
    return done(error, result);
  });
}

function _findTransaction(pipe, done) {
  return transactionsRepository.findLatestByDataset(pipe.dataset._id, (error, transaction) => {
    pipe.transaction = transaction;
    return done(error, pipe);
  });
}

function authenticate(credentials, onAuthenticated) {
  return authService.authenticate(credentials, onAuthenticated);
}

function findDatasetsWithVersions(userId, onFound) {
  return datasetsService.findDatasetsWithVersions(userId, onFound);
}

function setTransactionAsDefault(userId, datasetName, transactionCommit, onSetAsDefault) {
  return transactionsService.setTransactionAsDefault(userId, datasetName, transactionCommit, onSetAsDefault);
}

function cleanDdfRedisCache(onCacheCleaned) {
  const cacheCleaningTasks = [
    done => cache.del(`${constants.DDF_REDIS_CACHE_NAME_DDFQL}*`, done),
  ];

  return async.parallelLimit(cacheCleaningTasks, constants.LIMIT_NUMBER_PROCESS, onCacheCleaned);
}

function setAccessTokenForDataset(datasetName, userId, onAccessTokenSet) {
  crypto.randomBytes(24, (randomBytesError, buf) => {
    if (randomBytesError) {
      return onAccessTokenSet(randomBytesError);
    }

    const options = {
      userId,
      datasetName,
      accessToken: buf.toString('hex')
    };

    return datasetsRepository.setAccessTokenForPrivateDataset(options, onAccessTokenSet);
  });
}
