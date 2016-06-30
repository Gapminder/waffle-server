'use strict';

const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const passport = require('passport');
const JSONStream = require('JSONStream');
const compression = require('compression');

const routeUtils = require('../../utils');

const cliService = require('./cli.service');
const reposService = require('../import/repos.service');
const transactionsService = require('../../../ws.services/dataset-transactions.service');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const config = app.get('config');
  const logger = app.get('log');
  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  router.use(cors());
  router.use(compression());
  router.use(routeUtils.decodeQuery);

  // authentication route should be defined before router.use(passport.authenticate('token'));
  // cause it is entry point for acquiring token and requesting other resources
  router.post('/api/ddf/cli/authenticate', _getToken);

  router.use(routeUtils.ensureAuthenticatedViaToken(config.NODE_ENV));

  router.get('/api/ddf/cli/prestored-queries', _getPrestoredQueries);

  router.post('/api/ddf/cli/update-incremental', _updateIncrementally);

  router.post('/api/ddf/cli/import-dataset', _importDataset);

  router.get('/api/ddf/cli/git-commits-list', _getGitCommitsList);

  router.get('/api/ddf/cli/commit-of-latest-dataset-version', _getCommitOfLatestDatasetVersion);

  router.get('/api/ddf/cli/transactions/latest/status', _getStateOfLatestTransaction);

  router.post('/api/ddf/cli/transactions/latest/rollback', _activateRollback);

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
        return res.json({success: !error, error});
      }

      return res.json({success: !error, data: {token}});
    });
  }

  function _getStateOfLatestTransaction(req, res) {
    const datasetName = req.query.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'});
    }

    return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, (statusError, status) => {
      if (statusError) {
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
        return res.json({success: !rollbackError, error: rollbackError});
      }

      return res.json({success: !rollbackError, message: 'Rollback completed successfully'});
    });
  }

  function _getPrestoredQueries(req, res) {
    cliService.getPrestoredQueries ((error, queries) => {
      logger.info(`finished getting prestored queries`);

      if (error) {
        return res.json({success: !error, error});
      }

      return res.json({success: !error, data: queries});
    });
  }

  function _updateIncrementally(req, res) {
    bodyFromStream(req, (error, body) => {
      if (error) {
        return res.json({success: !error, error});
      }

      cliService.updateIncrementally(body, app, updateError => {
        if (updateError) {
          return res.json({success: !updateError, error: updateError});
        }

        return res.json({success: !updateError, message: 'Dataset was updated successfully'});
      });
    });

    function bodyFromStream(req, onBodyTransformed) {
      let result = {};
      req.pipe(JSONStream.parse('$*'))
        .on('data', entry => {
          const data = entry.value;

          const repoName = reposService.getRepoName(data.github);
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
    let params = req.body;

    cliService.importDataset(params, config, app, error => {
      logger.info(`finished import for dataset '${params.github}' and commit '${params.commit}'`);

      if (error) {
        return res.json({success: !error, error});
      }

      return res.json({success: !error, message: 'Dataset was imported successfully'});
    });
  }

  function _getGitCommitsList(req, res) {
    const github = req.query.github;

    cliService.getGitCommitsList(github, config, (error, result) => {
      logger.info(`finished getting commits list for dataset '${github}'`);

      if (error) {
        return res.json({success: !error, error});
      }

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
      logger.info(`finished getting latest commit '${result.transaction.commit}' for dataset '${github}'`);

      if (error) {
        return res.json({success: !error, error});
      }

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
