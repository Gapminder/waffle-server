'use strict';

const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const passport = require('passport');
const compression = require('compression');

const routeUtils = require('../../utils');

const cliService = require('./../../../ws.services/cli.service');
const reposService = require('../../../ws.services/repos.service');
const transactionsService = require('../../../ws.services/dataset-transactions.service');
const datasetsService = require('../../../ws.services/datasets.service');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');

module.exports = serviceLocator => {
  const router = express.Router();

  router.use(cors());
  router.use(compression());

  // authentication route should be defined before router.use(passport.authenticate('token'));
  // cause it is entry point for acquiring token and requesting other resources
  router.post('/api/ddf/cli/authenticate', _getToken);

  router.use(routeUtils.ensureAuthenticatedViaToken);

  router.get('/api/ddf/cli/prestored-queries', _getAvailableDatasetsAndVersions);

  router.post('/api/ddf/cli/update-incremental', _updateIncrementally);

  router.post('/api/ddf/cli/import-dataset', _importDataset);

  router.post('/api/ddf/cli/remove-dataset', _removeDataset);

  router.get('/api/ddf/cli/git-commits-list', _getGitCommitsList);

  router.get('/api/ddf/cli/commit-of-latest-dataset-version', _getCommitOfLatestDatasetVersion);

  router.get('/api/ddf/cli/transactions/latest/status', _getStateOfLatestTransaction);

  router.post('/api/ddf/cli/transactions/latest/rollback', _activateRollback);

  router.get('/api/ddf/cli/datasets', _getDatasets);

  router.post('/api/ddf/cli/datasets/default', _setDefaultDataset);

  router.post('/api/ddf/cli/datasets/accessToken', _generateDatasetAccessToken);

  const app = serviceLocator.getApplication();
  return app.use(router);

  function _getToken(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    if (!email) {
      return res.json({success: false, error: 'Email was not provided'});
    }

    if (!password) {
      return res.json({success: false, error: 'Password was not provided'});
    }

    return cliService.authenticate({email, password}, (error, token) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      return res.json({success: !error, data: {token}});
    });
  }

  function _setDefaultDataset(req, res) {
    const datasetName = req.body.datasetName;
    const transactionCommit = req.body.commit;

    if (!req.user) {
      return res.json({success: false, error: 'There is no authenticated user to get its datasets'});
    }

    if (!datasetName) {
      return res.json({success: false, error: 'Dataset name was not provided'});
    }

    if (!transactionCommit) {
      return res.json({success: false, error: 'Transaction commit was not provided'});
    }

    cliService.setTransactionAsDefault(req.user._id, datasetName, transactionCommit, (error, defaultDatasetAndCommit) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      return cliService.cleanDdfRedisCache(cacheCleanError => {
        if (cacheCleanError) {
          logger.error(cacheCleanError);
          return res.json({success: !cacheCleanError, error: cacheCleanError});
        }

        return res.json({success: !error, data: defaultDatasetAndCommit});
      });
    });
  }

  function _getDatasets(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'There is no authenticated user to get its datasets'});
    }

    return cliService.findDatasetsWithVersions(req.user._id, (error, datasetsWithVersions) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      return res.json({success: !error, data: datasetsWithVersions});
    });
  }

  function _getStateOfLatestTransaction(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'Unauthenticated user cannot perform CLI operations'});
    }

    const datasetName = req.query.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, req.user, (statusError, status) => {
      if (statusError) {
        logger.error(statusError);
        return res.json({success: !statusError, error: statusError});
      }

      return res.json({success: !statusError, data: status});
    });
  }

  function _activateRollback(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'Unauthenticated user cannot perform CLI operations'});
    }

    const datasetName = req.body.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    return transactionsService.rollbackFailedTransactionFor(datasetName, req.user, rollbackError => {
      if (rollbackError) {
        logger.error(rollbackError);
        return res.json({success: !rollbackError, error: rollbackError});
      }

      return res.json({success: !rollbackError, message: 'Rollback completed successfully'});
    });
  }

  function _removeDataset(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'There is no authenticated user to remove dataset'});
    }

    const datasetName = req.body.datasetName;

    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    const userId = req.user._id;

    return datasetsService.removeDatasetData(datasetName, userId, removeError => {
      if (removeError) {
        logger.error(removeError);
        return res.json({success: !removeError, error: removeError});
      }

      return res.json({success: !removeError, message: 'Removing dataset was completed successfully'});
    });
  }

  function _getAvailableDatasetsAndVersions(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'There is no authenticated user to get its datasets'});
    }

    cliService.getAvailableDatasetsAndVersions (req.user._id, (error, datasetsAndVersions) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      logger.info(`finished getting available datasets and versions`);

      return res.json({success: !error, data: datasetsAndVersions});
    });
  }

  function _updateIncrementally(req, res) {
    const {hashFrom, hashTo, github} = req.body;

    if (!hashFrom) {
      return res.json({success: false, message: 'Start commit for update was not given'});
    }

    if (!hashTo) {
      return res.json({success: false, message: 'End commit for update was not given'});
    }

    if (!github) {
      return res.json({success: false, message: 'Repository github url was not given'});
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
            return res.json({success: true, message: 'Dataset updating is in progress ...'});
          }
        }
      }
    };

    cliService.updateIncrementally(options, updateError => {
      if (updateError && !res.headersSent) {
        logger.error(updateError);
        return res.json({success: !updateError, error: updateError});
      }

      if (updateError) {
        return logger.error(updateError);
      }

      logger.info(`finished import for dataset '${github}' and commit '${hashTo}'`);
    });
  }

  function _importDataset(req, res) {
    const params = req.body;

    params.lifecycleHooks = {
      onTransactionCreated: () => {
        if (!res.headersSent) {
          res.json({success: true, message: 'Dataset importing is in progress ...'});
        }
      }
    };

    return cliService.importDataset(params, importError => {
      if (importError && !res.headersSent) {
        logger.error(importError);
        return res.json({success: !importError, error: importError});
      }

      if (importError) {
        return logger.error(importError);
      }

      logger.info(`finished import for dataset '${params.github}' and commit '${params.commit}'`);
    });
  }

  function _getGitCommitsList(req, res) {
    const github = req.query.github;

    cliService.getGitCommitsList(github, (error, result) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      logger.info(`finished getting commits list for dataset '${github}'`);

      return res.json({
        success: !error,
        data: {
          commits: result.commits
        }
      });
    });
  }

  function _getCommitOfLatestDatasetVersion(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'Unauthenticated user cannot perform CLI operations'});
    }

    const github = req.query.github;

    cliService.getCommitOfLatestDatasetVersion(github, req.user, (error, result) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      logger.info(`finished getting latest commit '${result.transaction.commit}' for dataset '${github}'`);

      return res.json({
        success: !error,
        data: {
          github: result.dataset.path,
          dataset: result.dataset.name,
          commit: result.transaction.commit
        }
      });
    });
  }

  function _generateDatasetAccessToken(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'Unauthenticated user cannot perform CLI operations'});
    }

    const datasetName = req.body.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    return cliService.setAccessTokenForDataset(datasetName, req.user._id, (error, dataset) => {
      if (error) {
        logger.error(error);
        return res.json({success: false, error});
      }

      if (!dataset) {
        logger.warn(`User was trying to generate an accessToken for not existing dataset: ${datasetName} or dataset that is not owned by him (Id: ${req.user._id}).`);
        return res.json({success: false, error: 'Cannot generate access token for given dataset'});
      }

      return res.json({success: true, data: {accessToken: dataset.accessToken}});
    });
  }
};
