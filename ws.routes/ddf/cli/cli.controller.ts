import * as _ from 'lodash';
import * as hi from 'highland';
import { logger } from '../../../ws.config/log';
import * as authService from '../../../ws.services/auth.service';
import * as cliService from '../../../ws.services/cli.service';
import * as transactionsService from '../../../ws.services/dataset-transactions.service';
import * as datasetsService from '../../../ws.services/datasets.service';
import * as reposService from '../../../ws.services/repos.service';
import * as cacheUtils from '../../../ws.utils/cache-warmup';
import * as routeUtils from '../../utils';
import { cleanRepos as cliApiCleanRepos } from 'waffle-server-import-cli';
import { config } from '../../../ws.config/config';
import { Response } from 'express';
import { RecentDdfqlQueriesRepository } from '../../../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import { WSRequest as Request } from '../../utils';

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
  setMongolessDefaultDataset,
  generateDatasetAccessToken,
  getPrivateDatasets,
  getDatasetsInProgress,
  cleanCache,
  cleanRepos,
  getStateOfRecentQueries
};

function getToken(req: Request, res: Response): Response | void {
  logger.info(req.body);

  const email = req.body.email;
  const password = req.body.password;

  if (!email) {
    return res.json(routeUtils.toErrorResponse('Email was not provided', req, 'getToken'));
  }

  if (!password) {
    return res.json(routeUtils.toErrorResponse('Password was not provided', req, 'getToken'));
  }

  return authService.authenticate({ email, password }, (error: string, token: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req, 'getToken'));
    }

    return res.json(routeUtils.toDataResponse({ token }));
  });
}

function setDefaultDataset(req: Request, res: Response): Response | void {
  const datasetName = req.body.datasetName;
  const transactionCommit = req.body.commit;

  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('Dataset name was not provided', req));
  }

  if (!transactionCommit) {
    return res.json(routeUtils.toErrorResponse('Transaction commit was not provided', req));
  }

  cliService.setTransactionAsDefault(req.user._id, datasetName, transactionCommit, (error: string, defaultDatasetAndCommit: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    return cliService.cleanDdfRedisCache((cacheCleanError: string) => {
      if (cacheCleanError) {
        return res.json(routeUtils.toErrorResponse(cacheCleanError, req));
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

function setMongolessDefaultDataset(req: Request, res: Response): Response | void {
  const datasetName = req.body.datasetName;
  const transactionCommit = req.body.commit;

  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('Dataset name was not provided', req));
  }

  if (!transactionCommit) {
    return res.json(routeUtils.toErrorResponse('Transaction commit was not provided', req));
  }

  config.DEFAULT_DATASET = datasetName;
  config.DEFAULT_DATASET_VERSION = transactionCommit;

  return cliService.cleanDdfRedisCache((cacheCleanError: string) => {
    if (cacheCleanError) {
      return res.json(routeUtils.toErrorResponse(cacheCleanError, req));
    }

    cacheUtils.warmUpCache((cacheWarmUpError: string) => {
      if (cacheWarmUpError) {
        return logger.error('Cache warm up error. ', cacheWarmUpError);
      }
      return logger.info('Cache is warmed up.');
    });

    return res.json(routeUtils.toDataResponse({
      name: datasetName,
      commit: transactionCommit,
      createdAt: new Date()
    }));
  });
}

function getDatasets(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  return cliService.findDatasetsWithVersions(req.user._id, (error: string, datasetsWithVersions: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    return res.json(routeUtils.toDataResponse(datasetsWithVersions));
  });
}

function getStateOfLatestTransaction(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations', req));
  }

  const datasetName = req.query.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given', req));
  }

  return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, req.user, (statusError: string, status: any) => {
    if (statusError) {
      return res.json(routeUtils.toErrorResponse(statusError, req));
    }

    return res.json(routeUtils.toDataResponse(status));
  });
}

function getStateOfDatasetRemoval(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations', req));
  }

  const datasetName = req.query.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given', req));
  }

  return datasetsService.getRemovalStateForDataset(datasetName, req.user, (statusError: string, status: any) => {
    if (statusError) {
      return res.json(routeUtils.toErrorResponse(statusError, req));
    }

    return res.json(routeUtils.toDataResponse(status));
  });
}

function activateRollback(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations', req));
  }

  const datasetName = req.body.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given', req));
  }

  return transactionsService.rollbackFailedTransactionFor(datasetName, req.user, (rollbackError: string) => {
    if (rollbackError) {
      return res.json(routeUtils.toErrorResponse(rollbackError, req));
    }

    return res.json(routeUtils.toMessageResponse('Rollback completed successfully'));
  });
}

function removeDataset(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to remove dataset', req));
  }

  const datasetName = req.body.datasetName;

  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given', req));
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

function getAvailableDatasetsAndVersions(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  cliService.getAvailableDatasetsAndVersions(req.user._id, (error: string, datasetsAndVersions: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    logger.info(`finished getting available datasets and versions`);

    return res.json(routeUtils.toDataResponse(datasetsAndVersions));
  });
}

function getRemovableDatasets(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  cliService.getRemovableDatasets(req.user._id, (error: string, removableDatasets: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    logger.info(`finished getting removable datasets`);
    return res.json(routeUtils.toDataResponse(removableDatasets));
  });
}

function getPrivateDatasets(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  cliService.getPrivateDatasets(req.user._id, (error: string, privateDatasets: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    logger.info(`finished getting private datasets`);

    return res.json(routeUtils.toDataResponse(privateDatasets));
  });
}

function updateIncrementally(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations', req));
  }

  const { hashFrom, hashTo, github } = req.body;

  if (!hashFrom) {
    return res.json(routeUtils.toErrorResponse('Start commit for update was not given', req));
  }

  if (!hashTo) {
    return res.json(routeUtils.toErrorResponse('End commit for update was not given', req));
  }

  if (!github) {
    return res.json(routeUtils.toErrorResponse('Repository github url was not given', req));
  }

  const options = {
    github,
    hashTo,
    commit: hashTo,
    hashFrom,
    datasetName: reposService.getRepoNameForDataset(github),
    lifecycleHooks: {
      onTransactionCreated: (): Response | void => {
        if (!res.headersSent) {
          return res.json(routeUtils.toMessageResponse('Dataset updating is in progress ...'));
        }
      }
    }
  };

  cliService.updateIncrementally(options, (updateError: string) => {
    if (updateError && !res.headersSent) {
      return res.json(routeUtils.toErrorResponse(updateError, req));
    }

    if (updateError) {
      return logger.error(updateError);
    }

    logger.info(`finished import for dataset '${github}' and commit '${hashTo}'`);
  });
}

function importDataset(req: Request, res: Response): Response | void {
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
      return res.json(routeUtils.toErrorResponse(importError, req));
    }

    if (importError) {
      return logger.error(importError);
    }

    logger.info(`finished import for dataset '${params.github}' and commit '${params.commit}'`);
  });
}

function getCommitOfLatestDatasetVersion(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations', req));
  }

  const github = req.query.github;

  if (!github) {
    return res.json(routeUtils.toErrorResponse('Repository github url was not given', req));
  }

  cliService.getCommitOfLatestDatasetVersion(github, req.user, (error: string, result: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    logger.info(`finished getting latest commit '${result.transaction.commit}' for dataset '${github}'`);

    return res.json(routeUtils.toDataResponse({
      github: result.dataset.path,
      dataset: result.dataset.name,
      commit: result.transaction.commit
    }));
  });
}

function generateDatasetAccessToken(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations', req));
  }

  const datasetName = req.body.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given', req));
  }

  return cliService.setAccessTokenForDataset(datasetName, req.user._id, (error: string, dataset: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    if (!dataset) {
      logger.warn(`User was trying to generate an accessToken for not existing dataset: ${datasetName} or dataset that is not owned by him (Id: ${req.user._id}).`);
      return res.json(routeUtils.toErrorResponse('Cannot generate access token for given dataset', req));
    }

    return res.json(routeUtils.toDataResponse({ accessToken: dataset.accessToken }));
  });
}

function cleanCache(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  return cliService.cleanDdfRedisCache((cacheCleanError: string) => {
    if (cacheCleanError) {
      return res.json(routeUtils.toErrorResponse(cacheCleanError, req));
    }
    return res.json(routeUtils.toMessageResponse('Cache is clean'));
  });
}

function cleanRepos(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to make this action', req));
  }

  return cliApiCleanRepos(config.PATH_TO_DDF_REPOSITORIES, (reposCleanError: string) => {
    if (reposCleanError) {
      return res.json(routeUtils.toErrorResponse(reposCleanError, req));
    }

    return ddfImportUtils.cloneImportedDdfRepos()
      .then(() => {
        return res.json(routeUtils.toMessageResponse('Repos folder was cleaned and cloned successfully'));
      })
      .catch((reposCloneError: string) => {
        return res.json(routeUtils.toErrorResponse(reposCloneError, req));
      });
  });
}

function getDatasetsInProgress(req: Request, res: Response): Response | void {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets', req));
  }

  cliService.getDatasetsInProgress(req.user._id, (error: string, datasetsInProgress: any) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    logger.info(`finished getting private datasets is progress`);

    return res.json(routeUtils.toDataResponse(datasetsInProgress));
  });
}

function getStateOfRecentQueries(req: Request, res: Response): void {
  let recentQueries = [];

  const recentDdfqlQueriesStream = hi(RecentDdfqlQueriesRepository.findAllAsStream())
    .tap((recentQuery: any) => {
      logger.debug(recentQuery.toObject());
      recentQueries.push(_.pick(recentQuery.toObject(), [ 'queryRaw', 'type', 'docsAmount', 'timeSpentInMillis' ]));
    });

  return ddfImportUtils.startStreamProcessing(recentDdfqlQueriesStream, null, (error: string) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error, req));
    }

    return res.json(routeUtils.toDataResponse(recentQueries));
  });
}
