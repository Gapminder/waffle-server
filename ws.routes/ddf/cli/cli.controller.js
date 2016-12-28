'use strict';

const cliService = require('./../../../ws.services/cli.service');
const reposService = require('../../../ws.services/repos.service');
const transactionsService = require('../../../ws.services/dataset-transactions.service');
const datasetsService = require('../../../ws.services/datasets.service');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const routeUtils = require('../../utils');
const cacheUtils = require('../../../ws.utils/cache-warmup');

module.exports = {
  getToken,
  getAvailableDatasetsAndVersions,
  updateIncrementally,
  importDataset,
  removeDataset,
  getGitCommitsList,
  getCommitOfLatestDatasetVersion,
  getStateOfLatestTransaction,
  activateRollback,
  getDatasets,
  setDefaultDataset,
  generateDatasetAccessToken,
};

function getToken(req, res) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email) {
    return res.json(routeUtils.toErrorResponse('Email was not provided'));
  }

  if (!password) {
    return res.json(routeUtils.toErrorResponse('Password was not provided'));
  }

  return cliService.authenticate({email, password}, (error, token) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return res.json(routeUtils.toDataResponse({token}));
  });
}

function setDefaultDataset(req, res) {
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

  cliService.setTransactionAsDefault(req.user._id, datasetName, transactionCommit, (error, defaultDatasetAndCommit) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return cliService.cleanDdfRedisCache(cacheCleanError => {
      if (cacheCleanError) {
        return res.json(routeUtils.toErrorResponse(cacheCleanError));
      }

      cacheUtils.warmUpCache(cacheWarmUpError => {
        if (cacheWarmUpError) {
          return logger.error('Cache warm up error. ', cacheWarmUpError);
        }
        return logger.info('Cache is warmed up.');
      });

      return res.json(routeUtils.toDataResponse(defaultDatasetAndCommit));
    });
  });
}

function getDatasets(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  return cliService.findDatasetsWithVersions(req.user._id, (error, datasetsWithVersions) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    return res.json(routeUtils.toDataResponse(datasetsWithVersions));
  });
}

function getStateOfLatestTransaction(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.query.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, req.user, (statusError, status) => {
    if (statusError) {
      return res.json(routeUtils.toErrorResponse(statusError));
    }

    return res.json(routeUtils.toDataResponse(status));
  });
}

function activateRollback(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.body.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return transactionsService.rollbackFailedTransactionFor(datasetName, req.user, rollbackError => {
    if (rollbackError) {
      return res.json(routeUtils.toErrorResponse(rollbackError));
    }

    return res.json(routeUtils.toMessageResponse('Rollback completed successfully'));
  });
}

function removeDataset(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to remove dataset'));
  }

  const datasetName = req.body.datasetName;

  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  const user = req.user;

  return datasetsService.removeDatasetData(datasetName, user, removeError => {
    if (removeError) {
      return res.json(routeUtils.toErrorResponse(removeError));
    }

    return res.json(routeUtils.toMessageResponse('Removing dataset was completed successfully'));
  });
}

function getAvailableDatasetsAndVersions(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('There is no authenticated user to get its datasets'));
  }

  cliService.getAvailableDatasetsAndVersions (req.user._id, (error, datasetsAndVersions) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting available datasets and versions`);

    return res.json(routeUtils.toDataResponse(datasetsAndVersions));
  });
}

function updateIncrementally(req, res) {
  const {hashFrom, hashTo, github} = req.body;

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

  cliService.updateIncrementally(options, updateError => {
    if (updateError && !res.headersSent) {
      return res.json(routeUtils.toErrorResponse(updateError));
    }

    if (updateError) {
      return logger.error(updateError);
    }

    logger.info(`finished import for dataset '${github}' and commit '${hashTo}'`);
  });
}

function importDataset(req, res) {
  const params = req.body;

  params.lifecycleHooks = {
    onTransactionCreated: () => {
      if (!res.headersSent) {
        res.json(routeUtils.toMessageResponse('Dataset importing is in progress ...'));
      }
    }
  };

  return cliService.importDataset(params, importError => {
    if (importError && !res.headersSent) {
      return res.json(routeUtils.toErrorResponse(importError));
    }

    if (importError) {
      return logger.error(importError);
    }

    logger.info(`finished import for dataset '${params.github}' and commit '${params.commit}'`);
  });
}

function getGitCommitsList(req, res) {
  const github = req.query.github;

  cliService.getGitCommitsList(github, (error, result) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    logger.info(`finished getting commits list for dataset '${github}'`);

    return res.json(routeUtils.toDataResponse({commits: result.commits}));
  });
}

function getCommitOfLatestDatasetVersion(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const github = req.query.github;

  cliService.getCommitOfLatestDatasetVersion(github, req.user, (error, result) => {
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

function generateDatasetAccessToken(req, res) {
  if (!req.user) {
    return res.json(routeUtils.toErrorResponse('Unauthenticated user cannot perform CLI operations'));
  }

  const datasetName = req.body.datasetName;
  if (!datasetName) {
    return res.json(routeUtils.toErrorResponse('No dataset name was given'));
  }

  return cliService.setAccessTokenForDataset(datasetName, req.user._id, (error, dataset) => {
    if (error) {
      return res.json(routeUtils.toErrorResponse(error));
    }

    if (!dataset) {
      logger.warn(`User was trying to generate an accessToken for not existing dataset: ${datasetName} or dataset that is not owned by him (Id: ${req.user._id}).`);
      return res.json(routeUtils.toErrorResponse('Cannot generate access token for given dataset'));
    }

    return res.json(routeUtils.toDataResponse({accessToken: dataset.accessToken}));
  });
}
