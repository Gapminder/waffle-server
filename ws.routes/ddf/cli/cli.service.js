'use strict';

const _ = require('lodash');
const git = require('simple-git');
const async = require('async');
const wsCli = require('waffle-server-import-cli');
const ddfValidation = require('ddf-validation');
const SimpleDdfValidator = ddfValidation.SimpleValidator;

const cache = require('../../../ws.utils/redis-cache');
const config = require('../../../ws.config/config');
const constants = require('../../../ws.utils/constants');
const authService = require('../../../ws.services/auth.service');
const reposService = require('../../../ws.services/repos.service');
const datasetsService = require('../../../ws.services/datasets.service');
const usersRepository = require('../../../ws.repository/ddf/users/users.repository');
const importDdfService = require('../../../ws.import/import-ddf.service');
const datasetsRepository = require('../../../ws.repository/ddf/datasets/datasets.repository');
const transactionsService = require('../../../ws.services/dataset-transactions.service');
const transactionsRepository = require('../../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const incrementalUpdateService = require('../../../ws.import/incremental/update-ddf');

const ddfValidationConfig = {
  datapointlessMode: true,
  includeTags: 'WAFFLE_SERVER',
  excludeRules: 'FILENAME_DOES_NOT_MATCH_HEADER',
  indexlessMode: true
};

module.exports = {
  getGitCommitsList,
  importDataset,
  updateIncrementally,
  getAvailableDatasetsAndVersions,
  getCommitOfLatestDatasetVersion,
  authenticate,
  findDatasetsWithVersions,
  setTransactionAsDefault,
  cleanDdfRedisCache
};

function getGitCommitsList(github, cb) {
  if (!github) {
    return cb('Url to dataset\'s github repository was not provided');
  }

  return async.waterfall([
    async.constant({github}),
    _cloneDdfRepo,
    _getPathToRepo
  ], cb);
}

function _cloneDdfRepo(pipe, done) {
  return reposService.cloneRepo(pipe.github, pipe.commit || null, (error, repoInfo) => {
    pipe.repoInfo = repoInfo;
    return done(error, pipe);
  });
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
    _cloneDdfRepo,
    _validateDdfRepo,
    _importDdfService,
    _unlockDataset
  ], (importError, pipe) => {
    if (importError && pipe && pipe.transactionId) {
      return transactionsService.setLastError(pipe.transactionId, _.toString(importError), () => onDatasetImported(importError));
    }
    return onDatasetImported(importError, pipe);
  });
}

function _validateDdfRepo(pipe, onDdfRepoValidated) {
  const simpleDdfValidator = new SimpleDdfValidator(pipe.repoInfo.pathToRepo, ddfValidationConfig);
  simpleDdfValidator.on('finish', (error, isDatasetCorrect) => {
    if (error) {
      return onDdfRepoValidated(error);
    }

    if (!isDatasetCorrect) {
      return onDdfRepoValidated(`Ddf validation failed for dataset "${pipe.github}" and version "${pipe.commit}"`);
    }

    return onDdfRepoValidated(null, pipe);
  });
  return ddfValidation.validate(simpleDdfValidator);
}

function _findDataset(pipe, done) {
  return datasetsRepository.findByGithubUrl(pipe.github, (error, dataset) => {
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
  let options = {
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
    _lockDataset,
    _checkTransaction,
    _cloneDdfRepo,
    _validateDdfRepo,
    _generateDiffForDatasetUpdate,
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

function _generateDiffForDatasetUpdate(context, done) {
  const {hashFrom, hashTo, github} = context;
  return wsCli.generateDiff({hashFrom, hashTo, github, resultPath: config.PATH_TO_DIFF_DDF_RESULT_FILE}, (error, diffPaths) => {
    if (error) {
      return done(error);
    }

    const {diff: pathToDatasetDiff, lang: pathToLangDiff} = diffPaths;
    return done(null, _.extend(context, {pathToDatasetDiff, pathToLangDiff}));
  });
}

function _lockDataset(pipe, done) {
  return datasetsRepository.lock(pipe.datasetName, (err, dataset) => {
    if (err) {
      return done(err);
    }

    if (!dataset) {
      return done(`Version of dataset "${pipe.datasetName}" was already locked or dataset is absent`);
    }

    pipe.dataset = dataset;
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
  let options = {
    diff: pipe.diff,
    datasetName: pipe.datasetName,
    commit: pipe.commit,
    github: pipe.github,
    lifecycleHooks: pipe.lifecycleHooks,
    user: pipe.user,
    pathToDatasetDiff: pipe.pathToDatasetDiff,
    pathToLangDiff: pipe.pathToLangDiff
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

function getCommitOfLatestDatasetVersion(github, cb) {
  let pipe = {github};

  return async.waterfall([
    async.constant(pipe),
    _findDataset,
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
    done => cache.del(`${constants.DDF_REDIS_CACHE_NAME_CONCEPTS}*`, done),
    done => cache.del(`${constants.DDF_REDIS_CACHE_NAME_ENTITIES}*`, done),
    done => cache.del(`${constants.DDF_REDIS_CACHE_NAME_DATAPOINTS}*`, done),
    done => cache.del(`${constants.DDF_REDIS_CACHE_NAME_DDFQL}*`, done),
  ];

  return async.parallelLimit(cacheCleaningTasks, constants.LIMIT_NUMBER_PROCESS, onCacheCleaned);
}
