import * as async from 'async';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import * as importDdfService from '../ws.import/import-ddf';
import * as incrementalUpdateService from '../ws.import/incremental/update-ddf';
import { DatasetTransactionsRepository } from '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { DatasetsRepository } from '../ws.repository/ddf/datasets/datasets.repository';
import { usersRepository } from '../ws.repository/ddf/users/users.repository';
import { constants } from '../ws.utils/constants';
import { cache } from '../ws.utils/redis-cache';
import * as securityUtils from '../ws.utils/security';
import * as transactionsService from './dataset-transactions.service';
import * as datasetsService from './datasets.service';
import * as reposService from './repos.service';
import * as wsCli from 'waffle-server-import-cli';

export {
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
  name: string;
  path: string;
  versions: VersionModel[];
}

interface ContextModel {
  transactionId: string;
  datasetId: string;
}

interface VersionModel {
  createdAt: number;
  commit: string;
  isDefault: boolean;
}

function _findCurrentUser(pipe: any, done: Function): void {
  usersRepository.findUserByEmail(constants.DEFAULT_USER_EMAIL, (error: string, user: any) => {
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

function importDataset(params: any, onDatasetImported: Function): void {
  return async.waterfall([
    async.constant(params),
    _findCurrentUser,
    _transformDatasetRequest,
    _findDataset,
    _validateDatasetBeforeImport,
    _importDdfService,
    datasetsService.unlockDataset
  ], (importError: any, context: ContextModel) => {
    if (importError && _.get(context, 'transactionId', false)) {
      return transactionsService.setLastError(context.transactionId, _.toString(importError), () => onDatasetImported(importError));
    }
    return onDatasetImported(importError, context);
  });
}

function _transformDatasetRequest(pipe: any, done: Function): any {
  pipe.github = _checkAndSetDefaultBranch(pipe.github);

  _checkAndSetDefaultCommit(pipe, done);
}

function _checkAndSetDefaultBranch(githubUrl: string): string {
  const trimmedGithubUrl = _.trimEnd(githubUrl, '#');
  const isBranchExist = trimmedGithubUrl.match(/#(.*)/) ? trimmedGithubUrl.match(/#(.*)/)[0] : null;

  if(!isBranchExist) {
    return trimmedGithubUrl + '#master';
  } else {
    return githubUrl;
  }
}

function _checkAndSetDefaultCommit(pipe: any, done: Function): any {
  if(pipe.commit) {
    return done(null, pipe);
  } else {
    wsCli.getCommitListByGithubUrl(pipe.github, (error: string, commits: string[]) => {
      if (error) {
        return done(error);
      }

      pipe.commit = commits[commits.length -1];

      return done(null, pipe);
    });
  }
}

function _findDataset(pipe: any, done: Function): any {
  return DatasetsRepository.findByGithubUrl(pipe.github, (error: string, dataset: any) => {
    if (error) {
      return done(error);
    }

    pipe.dataset = dataset;
    return done(error, pipe);
  });
}

function _validateDatasetBeforeImport(pipe: any, done: Function): void {
  if (pipe.dataset) {
    return _handleAsynchronously('Dataset exists, cannot import same dataset twice', pipe, done);
  }

  return _handleAsynchronously(null, pipe, done);
}

function _importDdfService(pipe: any, onDatasetImported: Function): void {
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

function updateIncrementally(externalContext: any, onDatasetUpdated: Function): void {
  return async.waterfall([
    async.constant(externalContext),
    _findCurrentUser,
    _findDataset,
    securityUtils.validateDatasetOwner,
    datasetsService.lockDataset,
    _checkTransaction,
    _runIncrementalUpdate,
    datasetsService.unlockDataset
  ], (importError: any, context: ContextModel) => {
    if (importError) {
      if (_.get(context, 'transactionId', false)) {
        return transactionsService.setLastError(context.transactionId, _.toString(importError), () => onDatasetUpdated(importError));
      }

      return datasetsService.unlockDataset({ datasetName: externalContext.datasetName }, (unlockError: any) => onDatasetUpdated(importError));
    }

    return onDatasetUpdated(importError, context);
  });
}

function _checkTransaction(pipe: any, done: Function): void {
  return DatasetTransactionsRepository.findByDatasetAndCommit(pipe.dataset._id, pipe.commit, (error: string, transaction: any) => {
    if (error) {
      return done(error);
    }

    if (transaction) {
      return done(`Version of dataset "${pipe.github}" with commit: "${transaction.commit}" was already applied`);
    }

    return done(null, pipe);
  });
}

function _runIncrementalUpdate(pipe: any, onDatasetUpdated: Function): void {
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

function getPrivateDatasets(userId: any, done: Function): any {
  return DatasetsRepository.findPrivateByUser(userId, (error: string, datasets: any[]) => {
    if (error) {
      return done(error);
    }

    return done(null, _.map(datasets, (dataset: DatasetModel) => {
      return { name: dataset.name, githubUrl: dataset.path };
    }));
  });
}

function getDatasetsInProgress(userId: any, done: Function): any {
  return DatasetsRepository.findDatasetsInProgressByUser(userId, (error: string, datasets: any) => {
    if (error) {
      return done(error);
    }

    return done(null, _.map(datasets, (dataset: DatasetModel) => {
      return { name: dataset.name, githubUrl: dataset.path };
    }));
  });
}

function getAvailableDatasetsAndVersions(userId: any, onQueriesGot: Function): void {
  return datasetsService.findDatasetsWithVersions(userId, (searchingError: any, datasetsWithVersions: any) => {
    if (searchingError) {
      return onQueriesGot(searchingError);
    }

    return async.mapLimit(datasetsWithVersions, 3, (dataset: any, onDatasetsAndVersionsFound: AsyncResultCallback<any, any>) => {
      return async.mapLimit(dataset.versions, 3, (version: VersionModel, cb: Function) => {
        return cb(null, {
          createdAt: version.createdAt,
          datasetName: dataset.name,
          githubUrl: dataset.path,
          version: version.commit,
          isDefault: version.isDefault
        });
      }, onDatasetsAndVersionsFound);
    }, (error: string, result: any) => {
      return onQueriesGot(null, _.flattenDeep(result));
    });
  });
}

function getRemovableDatasets(userId: any, done: Function): void {
  return getAvailableDatasetsAndVersions(userId, (error: string, availableDatasetsAndVersions: any) => {
    if (error) {
      return done(error);
    }

    const defaultDatasetName = _.get(_.find(availableDatasetsAndVersions, (dataset: DatasetModel | VersionModel) => _.get(dataset, 'isDefault', false)), 'datasetName');

    const removableDatasets = _.chain(availableDatasetsAndVersions)
      .filter((metadata: any) => metadata.datasetName !== defaultDatasetName)
      .uniqBy('datasetName')
      .map((metadata: any) => {
        return { name: metadata.datasetName, githubUrl: metadata.githubUrl };
      })
      .value();

    return done(null, removableDatasets);
  });
}

function getCommitOfLatestDatasetVersion(github: string, user: any, cb: AsyncResultCallback<any, any>): void {
  return async.waterfall([
    async.constant({ github, user }),
    _findDataset,
    securityUtils.validateDatasetOwner,
    _validateDatasetBeforeIncrementalUpdate,
    _findTransaction
  ], cb);
}

function _validateDatasetBeforeIncrementalUpdate(pipe: any, done: Function): void {
  if (!pipe.dataset) {
    return _handleAsynchronously('Dataset was not found, hence hash commit of it\'s latest version cannot be acquired', pipe, done);
  }

  if (pipe.dataset.isLocked) {
    return _handleAsynchronously('Dataset was locked. Please, start rollback process.', pipe, done);
  }

  return _handleAsynchronously(null, pipe, done);
}

function _handleAsynchronously(error: string, result: any, done: Function): void {
  return async.setImmediate(() => {
    return done(error, result);
  });
}

function _findTransaction(pipe: any, done: Function): void {
  return DatasetTransactionsRepository.findLatestByDataset(pipe.dataset._id, (error: string, transaction: any) => {
    if (error) {
      return done(error);
    }

    pipe.transaction = transaction;
    return done(null, pipe);
  });
}

function findDatasetsWithVersions(userId: any, onFound: AsyncResultCallback<any, any>): void {
  return datasetsService.findDatasetsWithVersions(userId, onFound);
}

function setTransactionAsDefault(userId: any, datasetName: string, transactionCommit: string, onSetAsDefault: AsyncResultCallback<any, any>): void {
  return transactionsService.setTransactionAsDefault(userId, datasetName, transactionCommit, onSetAsDefault);
}

function cleanDdfRedisCache(onCacheCleaned: AsyncResultCallback<any, any>): void {
  const cacheCleaningTasks = [
    (done: Function) => cache.del(`${constants.DDF_REDIS_CACHE_NAME_DDFQL}*`, done)
  ];

  return async.parallelLimit(cacheCleaningTasks, constants.LIMIT_NUMBER_PROCESS, onCacheCleaned);
}

function setAccessTokenForDataset(datasetName: string, userId: any, onAccessTokenSet: Function): void {
  crypto.randomBytes(24, (randomBytesError: Error, buf: Buffer) => {
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
