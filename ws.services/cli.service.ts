import * as _ from 'lodash';
import * as git from 'simple-git';
import * as async from 'async';
import * as crypto from 'crypto';
import {cache} from '../ws.utils/redis-cache';
import {constants} from '../ws.utils/constants';
import * as reposService from './repos.service';
import * as securityUtils from '../ws.utils/security';
import * as ddfImportUtils from '../ws.import/utils/import-ddf.utils';
import * as datasetsService from './datasets.service';
import {UsersRepository} from '../ws.repository/ddf/users/users.repository';
import * as importDdfService from '../ws.import/import-ddf';
import { DatasetsRepository } from '../ws.repository/ddf/datasets/datasets.repository';
import * as transactionsService from './dataset-transactions.service';
import {DatasetTransactionsRepository} from '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import * as incrementalUpdateService from '../ws.import/incremental/update-ddf';

export {
  getGitCommitsList,
  importDataset,
  updateIncrementally,
  getAvailableDatasetsAndVersions,
  getCommitOfLatestDatasetVersion,
  findDatasetsWithVersions,
  setTransactionAsDefault,
  cleanDdfRedisCache,
  setAccessTokenForDataset,
  getPrivateDatasets,
  getDatasetsInProgress,
  getRemovableDatasets
};

interface DatasetModel {
  name: string,
  path: string,
  versions: Array<VersionModel>
}

interface ContextModel {
  transactionId: string,
  datasetId: string
}

interface VersionModel {
  createdAt: number,
  commit: string,
  isDefault: boolean
}

function getGitCommitsList(github, onCommitsRecieved) {
  if (!github) {
    return onCommitsRecieved('Url to dataset\'s github repository was not provided');
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
  UsersRepository.findUserByEmail(constants.DEFAULT_USER_EMAIL, (error, user) => {
    if (error) {
      return done(error);
    }

    if (!user) {
      return done('User that tries to initiate import was not found');
    }

    pipe.user = user;
    return done(null, pipe);
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
  ], (importError, context: ContextModel) => {
    if (importError && _.get(context, 'transactionId', false)) {
      return transactionsService.setLastError(context.transactionId, _.toString(importError), () => onDatasetImported(importError));
    }
    return onDatasetImported(importError, context);
  });
}

function _findDataset(pipe, done) {
  return DatasetsRepository.findByGithubUrl(pipe.github, (error, dataset) => {
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

  return importDdfService.importDdf(options, onDatasetImported);
}

function _unlockDataset(pipe, done) {
  return DatasetsRepository.unlock(pipe.datasetName, (err, dataset) => {
    if (!dataset) {
      return done(`Version of dataset "${pipe.datasetName}" wasn't locked`);
    }

    return done(err, pipe);
  });
}

function updateIncrementally(externalContext, onDatasetUpdated) {
  return async.waterfall([
    async.constant(externalContext),
    _findCurrentUser,
    _findDataset,
    securityUtils.validateDatasetOwner,
    _lockDataset,
    _checkTransaction,
    _runIncrementalUpdate,
    _unlockDataset
  ], (importError, context:ContextModel) => {
    if (importError) {
      if (_.get(context, 'transactionId', false)) {
        return transactionsService.setLastError(context.transactionId, _.toString(importError), () => onDatasetUpdated(importError));
      }

      return _unlockDataset({datasetName: externalContext.datasetName}, unlockError => onDatasetUpdated(importError));
    }

    return onDatasetUpdated(importError, context);
  });
}

function _lockDataset(pipe, done) {
  return DatasetsRepository.lock(pipe.dataset.name, (err, dataset) => {
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
  return DatasetTransactionsRepository.findByDatasetAndCommit(pipe.dataset._id, pipe.commit, (error, transaction) => {
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

  return incrementalUpdateService.updateDdf(options, onDatasetUpdated);
}

function getPrivateDatasets(userId, done) {
  return DatasetsRepository.findPrivateByUser(userId, (error, datasets) => {
    if (error) {
      return done(error);
    }

    return done(null, _.map(datasets, (dataset:DatasetModel) => {
      return {name: dataset.name, githubUrl: dataset.path};
    }));
  });
}

function getDatasetsInProgress(userId, done) {
  return DatasetsRepository.findDatasetsInProgressByUser(userId, (error, datasets) => {
    if (error) {
      return done(error);
    }

    return done(null, _.map(datasets, (dataset:DatasetModel) => {
      return {name: dataset.name, githubUrl: dataset.path};
    }));
  });
}

function getAvailableDatasetsAndVersions(userId, onQueriesGot) {
  return datasetsService.findDatasetsWithVersions(userId, (error, datasetsWithVersions) => {
    return async.mapLimit(datasetsWithVersions, 3, (dataset:DatasetModel, onDatasetsAndVersionsFound) => {
      return async.mapLimit(dataset.versions, 3, (version:VersionModel, cb) => {
        return cb(null, {
          createdAt: version.createdAt,
          datasetName: dataset.name,
          githubUrl: dataset.path,
          version: version.commit,
          isDefault: version.isDefault
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

function getRemovableDatasets(userId, done) {
  return getAvailableDatasetsAndVersions(userId, (error, availableDatasetsAndVersions) => {
    if (error) {
      return done(error);
    }

    const defaultDatasetName = _.get(_.find(availableDatasetsAndVersions, (dataset:DatasetModel | VersionModel) => _.get(dataset, 'isDefault', false)), 'datasetName');

    const removableDatasets = _.chain(availableDatasetsAndVersions)
      .filter(metadata => metadata.datasetName !== defaultDatasetName)
      .uniqBy('datasetName')
      .map(metadata => {
        return {name: metadata.datasetName, githubUrl: metadata.githubUrl};
      })
      .value();

    return done(null, removableDatasets);
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
  return DatasetTransactionsRepository.findLatestByDataset(pipe.dataset._id, (error, transaction) => {
    pipe.transaction = transaction;
    return done(error, pipe);
  });
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

    return DatasetsRepository.setAccessTokenForPrivateDataset(options, onAccessTokenSet);
  });
}
