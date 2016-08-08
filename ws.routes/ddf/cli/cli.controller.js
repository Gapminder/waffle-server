'use strict';

const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const passport = require('passport');
const JSONStream = require('JSONStream');
const compression = require('compression');

const routeUtils = require('../../utils');

const cliService = require('./cli.service');
const reposService = require('../../../ws.services/repos.service');
const transactionsService = require('../../../ws.services/dataset-transactions.service');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');

module.exports = serviceLocator => {
  const router = express.Router();

  router.use(cors());
  router.use(compression());
  router.use(routeUtils.decodeQuery);

  // authentication route should be defined before router.use(passport.authenticate('token'));
  // cause it is entry point for acquiring token and requesting other resources
  router.post('/api/ddf/cli/authenticate', _getToken);

  router.use(routeUtils.ensureAuthenticatedViaToken);

  router.get('/api/ddf/cli/prestored-queries', _getPrestoredQueries);

  router.post('/api/ddf/cli/update-incremental', _updateIncrementally);

  router.post('/api/ddf/cli/import-dataset', _importDataset);

  router.get('/api/ddf/cli/git-commits-list', _getGitCommitsList);

  router.get('/api/ddf/cli/commit-of-latest-dataset-version', _getCommitOfLatestDatasetVersion);

  router.get('/api/ddf/cli/transactions/latest/status', _getStateOfLatestTransaction);

  router.post('/api/ddf/cli/transactions/latest/rollback', _activateRollback);

  router.get('/api/ddf/cli/datasets', _getDatasets);

  router.post('/api/ddf/cli/datasets/default', _setDefaultDataset);

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
    const datasetName = req.query.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, (statusError, status) => {
      if (statusError) {
        logger.error(statusError);
        return res.json({success: !statusError, error: statusError});
      }

      return res.json({success: !statusError, data: status});
    });
  }

  function _activateRollback(req, res) {
    const datasetName = req.body.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    return transactionsService.rollbackFailedTransactionFor(datasetName, rollbackError => {
      if (rollbackError) {
        logger.error(rollbackError);
        return res.json({success: !rollbackError, error: rollbackError});
      }

      return res.json({success: !rollbackError, message: 'Rollback completed successfully'});
    });
  }

  function _getPrestoredQueries(req, res) {
    if (!req.user) {
      return res.json({success: false, error: 'There is no authenticated user to get its datasets'});
    }

    cliService.getPrestoredQueries (req.user._id, (error, queries) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      logger.info(`finished getting prestored queries`);

      return res.json({success: !error, data: queries});
    });
  }

  function _updateIncrementally(req, res) {
    bodyFromStream(req, (error, body) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      body.lifecycleHooks = {
        onTransactionCreated: () => {
          if (!res.headersSent) {
            return res.json({success: true, message: 'Dataset updating is in progress ...'});
          }
        }
      };

      cliService.updateIncrementally(body, updateError => {
        if (updateError && !res.headersSent) {
          logger.error(updateError);
          return res.json({success: !updateError, error: updateError});
        }

        if (updateError) {
          return logger.error(updateError);
        }

        logger.info(`finished import for dataset '${body.github}' and commit '${body.commit}'`);
      });
    });

    function bodyFromStream(req, onBodyTransformed) {
      let result = {};
      req.pipe(JSONStream.parse('$*'))
        .on('data', entry => {
          const data = entry.value;

          const repoName = reposService.getRepoNameForDataset(data.github);
          if (data.github && !repoName) {
            req.destroy();
            return onBodyTransformed(`Incorrect github url was given: ${data.github}`);
          }

          result.datasetName = repoName;
          result = _.merge(result, data);
        })
        .on('end', () => {
          if (_.isEmpty(result)) {
            return onBodyTransformed('No data (github, commit, etc.) was given for performing incremental update');
          }
          return onBodyTransformed(null, result);
        })
        .on('error', error => {
          return onBodyTransformed(error);
        });
    }
  }

  function _importDataset(req, res) {
    const params = req.body;

    params.lifecycleHooks = {
      onDatasetCreated: () => {
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
    const github = req.query.github;

    cliService.getCommitOfLatestDatasetVersion(github, (error, result) => {
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
};
