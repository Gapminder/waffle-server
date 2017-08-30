import * as _ from 'lodash';
import * as hi from 'highland';
import {logger} from '../../../ws.config/log';
import * as authService from '../../../ws.services/auth.service';
import * as cliService from '../../../ws.services/cli.service';
import * as transactionsService from '../../../ws.services/dataset-transactions.service';
import * as datasetsService from '../../../ws.services/datasets.service';
import * as reposService from '../../../ws.services/repos.service';
import * as cacheUtils from '../../../ws.utils/cache-warmup';
import * as routeUtils from '../../utils';
import {cleanRepos as cliApiCleanRepos} from 'waffle-server-import-cli';
import {config} from '../../../ws.config/config';
import {Request, Response} from 'express';
import { DatasetTracker } from '../../../ws.services/datasets-tracker';
import { RecentDdfqlQueriesRepository } from '../../../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';

export {
  getToken,
  getAvailableDatasetsAndVersions,
  getRemovableDatasets,
  updateIncrementally,
  importDataset,
  removeDataset,
  getCommitOfLatestDatasetVersion,
  getStateOfLatestTransaction,
  getStateOfDatasetRemoval,
  activateRollback,
  getDatasets,
  setDefaultDataset,
  generateDatasetAccessToken,
  getPrivateDatasets,
  getDatasetsInProgress,
  cleanCache,
  cleanRepos,
  getStateOfRecentQueries
};

function getToken(req: Request, res: Response): Response | void {
  console.log(req.body);
  const email = req.body.email;
  const password = req.body.password;

  if (!email) {
    return res.json(routeUtils.toErrorResponse('Email was not provided'));
  }

  if (!password) {
    return res.json(routeUtils.toErrorResponse('Password was not provided'));
  }

  return authService.authenticate({ email, password }, (error: string, token: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return res.json(routeUtils.toDataResponse({ token }));
  });
}

function setDefaultDataset(req: any, res: any): void {
  const datasetName = req.body.datasetName;
  const transactionCommit = req.body.commit;

  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('Dataset name was not provided'));
  }

  if (!transactionCommit) {
    return res.json(routeUtils.toErrorResponse('Transaction commit was not provided'));
  }

  cliService.setTransactionAsDefault(req.user._id, datasetName, transactionCommit, (error: string, defaultDatasetAndCommit: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return cliService.cleanDdfRedisCache((cacheCleanError: string) => {
      if (cacheCleanError) {
        return res.json(routeUtils.toErrorResponse(cacheCleanError));
      }

      cacheUtils.warmUpCache((cacheWarmUpError: string) => {
        if (cacheWarmUpError) {
          return logger.error('Cache warm up error. ', cacheWarmUpError);
        }
        return logger.info('Cache is warmed up.');
      });

      return res.json(routeUtils.toDataResponse(defaultDatasetAndCommit));
    });
  });
}

function getDatasets(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  return cliService.findDatasetsWithVersions(req.user._id, (error: string, datasetsWithVersions: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return res.json(routeUtils.toDataResponse(datasetsWithVersions));
  });
}

function getStateOfLatestTransaction(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.query.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, req.user, (statusError: string, status: any) => {
    if (statusError) {
      return res.json(routeUtils.toErrorResponse(statusError));
    }

    status.modifiedObjects = DatasetTracker.get(datasetName).getState();

    return res.json(routeUtils.toDataResponse(status));
  });
}

function getStateOfDatasetRemoval(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.query.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return datasetsService.getRemovalStateForDataset(datasetName, req.user, (statusError: string, status: any) => {
    if (statusError) {
      return res.json(routeUtils.toErrorResponse(statusError));
    }

    return res.json(routeUtils.toDataResponse(status));
  });
}

function activateRollback(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.body.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return transactionsService.rollbackFailedTransactionFor(datasetName, req.user, (rollbackError: string) => {
    if (rollbackError) {
      return res.json(routeUtils.toErrorResponse(rollbackError));
    }

    return res.json(routeUtils.toMessageResponse('Rollback completed successfully'));
  });
}

function removeDataset(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to remove dataset'));
  }

  const datasetName = req.body.datasetName;

  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  const user = req.user;

  datasetsService.removeDatasetData(datasetName, user, (removeError: string) => {
    if (removeError) {
      return logger.error(removeError);
    }
    return logger.info('Dataset has been deleted successfully');
  });

  return res.json(routeUtils.toMessageResponse('Dataset is being deleted ...'));
}

function getAvailableDatasetsAndVersions(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  cliService.getAvailableDatasetsAndVersions(req.user._id, (error: string, datasetsAndVersions: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting available datasets and versions`);

    return res.json(routeUtils.toDataResponse(datasetsAndVersions));
  });
}

function getRemovableDatasets(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  cliService.getRemovableDatasets(req.user._id, (error: string, removableDatasets: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting removable datasets`);
    return res.json(routeUtils.toDataResponse(removableDatasets));
  });
}

function getPrivateDatasets(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  cliService.getPrivateDatasets(req.user._id, (error: string, privateDatasets: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting private datasets`);

    return res.json(routeUtils.toDataResponse(privateDatasets));
  });
}

function updateIncrementally(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const { hashFrom, hashTo, github } = req.body;

  if (!hashFrom) {
    return res.json(routeUtils.toErrorResponse('Start commit for update was not given'));
  }

  if (!hashTo) {
    return res.json(routeUtils.toErrorResponse('End commit for update was not given'));
  }

  if (!github) {
    return res.json(routeUtils.toErrorResponse('Repository github url was not given'));
  }

  const options = {
    github,
    hashTo,
    commit: hashTo,
    hashFrom,
    datasetName: reposService.getRepoNameForDataset(github),
    lifecycleHooks: {
      onTransactionCreated: () => {
        if (!res.headersSent) {
          return res.json(routeUtils.toMessageResponse('Dataset updating is in progress ...'));
        }
      }
    }
  };

  cliService.updateIncrementally(options, (updateError: string) => {
    if (updateError && !res.headersSent) {
      return res.json(routeUtils.toErrorResponse(updateError));
    }

    if (updateError) {
      return logger.error(updateError);
    }

    logger.info(`finished import for dataset '${github}' and commit '${hashTo}'`);
  });
}

function importDataset(req: any, res: any): void {
  const params = req.body;

  params.lifecycleHooks = {
    onTransactionCreated: () => {
      if (!res.headersSent) {
        res.json(routeUtils.toMessageResponse('Dataset importing is in progress ...'));
      }
    }
  };

  return cliService.importDataset(params, (importError: string) => {
    if (importError && !res.headersSent) {
      return res.json(routeUtils.toErrorResponse(importError));
    }

    if (importError) {
      return logger.error(importError);
    }

    logger.info(`finished import for dataset '${params.github}' and commit '${params.commit}'`);
  });
}

function getCommitOfLatestDatasetVersion(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const github = req.query.github;

  if (!github) {
    return res.json(routeUtils.toErrorResponse('Repository github url was not given'));
  }

  cliService.getCommitOfLatestDatasetVersion(github, req.user, (error: string, result: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting latest commit '${result.transaction.commit}' for dataset '${github}'`);

    return res.json(routeUtils.toDataResponse({
      github: result.dataset.path,
      dataset: result.dataset.name,
      commit: result.transaction.commit
    }));
  });
}

function generateDatasetAccessToken(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.body.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return cliService.setAccessTokenForDataset(datasetName, req.user._id, (error: string, dataset: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    if (!dataset) {
      logger.warn(`User was trying to generate an accessToken for not existing dataset: ${datasetName} or dataset that is not owned by him (Id: ${req.user._id}).`);
      return res.json(routeUtils.toErrorResponse('Cannot generate access token for given dataset'));
    }

    return res.json(routeUtils.toDataResponse({ accessToken: dataset.accessToken }));
  });
}

function cleanCache(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  return cliService.cleanDdfRedisCache((cacheCleanError: string) => {
    if (cacheCleanError) {
      return res.json(routeUtils.toErrorResponse(cacheCleanError));
    }
    return res.json(routeUtils.toMessageResponse('Cache is clean'));
  });
}

function cleanRepos(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to make this action'));
  }

  return cliApiCleanRepos(config.PATH_TO_DDF_REPOSITORIES, (reposCleanError: string) => {
    if (reposCleanError) {
      return res.json(routeUtils.toErrorResponse(reposCleanError));
    }

    return res.json(routeUtils.toMessageResponse('Repos folder was cleaned'));
  });
}

function getDatasetsInProgress(req: any, res: any): void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  cliService.getDatasetsInProgress(req.user._id, (error: string, datasetsInProgress: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting private datasets is progress`);

    return res.json(routeUtils.toDataResponse(datasetsInProgress));
  });
}

function getStateOfRecentQueries(req: any, res: any): void {
  let recentQueries = [];

  const recentDdfqlQueriesStream = hi(RecentDdfqlQueriesRepository.findAllAsStream())
    .tap((recentQuery: any) => {
      logger.debug(recentQuery.toObject());
      recentQueries.push(_.pick(recentQuery.toObject(), ['queryRaw', 'type', 'docsAmount', 'timeSpentInMillis']));
    });

  return ddfImportUtils.startStreamProcessing(recentDdfqlQueriesStream, null, (error: string) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return res.json(routeUtils.toDataResponse(recentQueries));
  });
}
